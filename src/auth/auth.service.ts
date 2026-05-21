import * as crypto from 'crypto';
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../database/redis.module';
import { AuthRepository } from './auth.repository';
import { MailerService } from '../mailer/mailer.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto } from './dto/auth.dto';

// ─── Tipos de respuesta ──────────────────────────────────────

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResult extends TokenPair {
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    roles: string[];
    primer_acceso: boolean;
    totp_activo: boolean;
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseSeconds(str: string): number {
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  return parseInt(match[1]) * (units[match[2]] ?? 1);
}

// ─── Servicio ────────────────────────────────────────────────

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
  ) {}

  // ─── LOGIN ───────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {

    // 1. Rate limiting por IP en Redis
    const ipKey = `login:attempts:${meta.ip}`;
    const attempts = await this.redis.incr(ipKey);
    if (attempts === 1) {
      const ttl = Math.floor(this.config.get<number>('auth.throttleTtl', 900_000) / 1000);
      await this.redis.expire(ipKey, ttl);
    }
    if (attempts > this.config.get<number>('auth.throttleLimit', 5)) {
      throw new UnauthorizedException('Demasiados intentos. Espere 15 minutos.');
    }

    // 2. Buscar usuario
    const usuario = await this.authRepo.findByEmail(dto.email, dto.institucion_id);
    const genericError = new UnauthorizedException('Email o contraseña incorrectos');

    if (!usuario) {
      this.logger.warn(`Login fallido — email no encontrado: ${dto.email}`);
      throw genericError;
    }

    // 3. Verificar bloqueo
    if (usuario.bloqueado_hasta && new Date() < new Date(usuario.bloqueado_hasta)) {
      throw new ForbiddenException(
        'Cuenta bloqueada temporalmente. Intente en 15 minutos.',
      );
    }

    if (!usuario.activo) {
      throw new ForbiddenException('Cuenta suspendida. Contacte al administrador.');
    }

    if (!usuario.cuenta_activada) {
      throw new ForbiddenException(
        'Cuenta pendiente de activación. Revisá tu email para activarla.',
      );
    }

    // 4. Verificar contraseña
    const passwordOk = await bcrypt.compare(dto.password, usuario.password_hash);
    if (!passwordOk) {
      await this.authRepo.registerFailedAttempt(usuario.id);
      await this.authRepo.auditLog({
        usuario_id: usuario.id,
        accion: 'LOGIN_FAILED',
        ip: meta.ip,
        user_agent: meta.userAgent,
      });
      throw genericError;
    }

    // 5. Verificar 2FA si está activo
    if (usuario.totp_activo) {
      if (!dto.totp_code) {
        throw new UnauthorizedException('Se requiere código de autenticación 2FA');
      }
      const totpOk =
        usuario.totp_secret &&
        authenticator.verify({ token: dto.totp_code, secret: usuario.totp_secret });

      if (!totpOk) {
        const recoveryUsed = await this.tryRecoveryCode(
          usuario.id,
          dto.totp_code,
          usuario.recovery_codes ?? [],
        );
        if (!recoveryUsed) {
          throw new UnauthorizedException('Código de autenticación inválido');
        }
      }
    }

    // 6. Login exitoso
    await this.authRepo.resetFailedAttempts(usuario.id);
    await this.redis.del(ipKey);

    const tokens = await this.generateTokenPair(usuario, meta);

    await this.authRepo.auditLog({
      usuario_id: usuario.id,
      accion: 'LOGIN_SUCCESS',
      ip: meta.ip,
      user_agent: meta.userAgent,
    });

    this.logger.log(`Login exitoso: ${usuario.email} | roles: ${usuario.roles.join(',')}`);

    return {
      ...tokens,
      usuario: {
        id:           usuario.id,
        nombre:       usuario.nombre,
        apellido:     usuario.apellido,
        email:        usuario.email,
        roles:        usuario.roles,
        primer_acceso: usuario.primer_acceso,
        totp_activo:  usuario.totp_activo,
      },
    };
  }

  // ─── REFRESH ─────────────────────────────────────────────────

  async refresh(
    refreshToken: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);

    // Fast path: buscar en Redis
    let userId = await this.redis.get(`refresh:${tokenHash}`);

    if (!userId) {
      // Fallback a BD
      const stored = await this.authRepo.findRefreshToken(tokenHash);
      if (!stored || stored.revoked || new Date() > new Date(stored.expires_at)) {
        throw new UnauthorizedException('Refresh token inválido o expirado');
      }
      userId = stored.usuario_id;
    }

    const usuario = await this.authRepo.findById(userId);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    // Rotar: revocar el anterior, emitir nuevo
    await this.authRepo.revokeRefreshToken(tokenHash);
    await this.redis.del(`refresh:${tokenHash}`);

    return this.generateTokenPair(usuario, meta);
  }

  // ─── LOGOUT ──────────────────────────────────────────────────

  async logout(
    refreshToken: string,
    accessToken: string,
    userId: string,
  ): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.authRepo.revokeRefreshToken(tokenHash);
    await this.redis.del(`refresh:${tokenHash}`);

    // Blacklist del access token hasta que expire
    const ttl = parseSeconds(this.config.get<string>('auth.jwtAccessExpiresIn', '15m'));
    await this.redis.setEx(`blacklist:${accessToken}`, ttl, '1');

    await this.authRepo.auditLog({ usuario_id: userId, accion: 'LOGOUT' });
  }

  async logoutAll(userId: string, accessToken: string): Promise<void> {
    await this.authRepo.revokeAllUserRefreshTokens(userId);
    await this.redis.del(`user:active:${userId}`);

    const ttl = parseSeconds(this.config.get<string>('auth.jwtAccessExpiresIn', '15m'));
    await this.redis.setEx(`blacklist:${accessToken}`, ttl, '1');

    await this.authRepo.auditLog({ usuario_id: userId, accion: 'LOGOUT_ALL' });
    this.logger.warn(`Todas las sesiones cerradas para usuario: ${userId}`);
  }

  // ─── 2FA ─────────────────────────────────────────────────────

  async setup2FA(
    userId: string,
    email: string,
  ): Promise<{ qrDataUrl: string; secret: string }> {
    const secret = authenticator.generateSecret();
    const issuer = this.config.get<string>('auth.otpIssuer', 'SGE');
    const otpAuthUrl = authenticator.keyuri(email, issuer, secret);
    const qrDataUrl = await qrcode.toDataURL(otpAuthUrl);

    // Guardar en Redis 10 min para que el usuario confirme
    await this.redis.setEx(`2fa:pending:${userId}`, 600, secret);

    return { qrDataUrl, secret };
  }

  async verify2FA(userId: string, totpCode: string): Promise<string[]> {
    const pendingSecret = await this.redis.get(`2fa:pending:${userId}`);
    if (!pendingSecret) {
      throw new BadRequestException(
        'Sesión de configuración 2FA expirada. Reiniciá el proceso.',
      );
    }

    const isValid = authenticator.verify({ token: totpCode, secret: pendingSecret });
    if (!isValid) {
      throw new BadRequestException('Código 2FA inválido');
    }

    // Generar 10 códigos de recuperación (texto plano, solo esta vez)
    const plainCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase(),
    );
    const hashedCodes = await Promise.all(
      plainCodes.map((c) => bcrypt.hash(c, 10)),
    );

    await this.authRepo.updateTotpSecret(userId, pendingSecret, hashedCodes);
    await this.redis.del(`2fa:pending:${userId}`);
    await this.redis.del(`user:active:${userId}`);

    this.logger.log(`2FA activado para usuario: ${userId}`);
    return plainCodes;
  }

  async getUser(userId: string) {
    return this.authRepo.findById(userId);
  }

  async getInstituciones() {
    return this.authRepo.getInstituciones();
  }

  // ─── CAMBIO DE CONTRASEÑA ────────────────────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const usuario = await this.authRepo.findById(userId);
    if (!usuario) throw new UnauthorizedException();

    const ok = await bcrypt.compare(currentPassword, usuario.password_hash);
    if (!ok) throw new UnauthorizedException('Contraseña actual incorrecta');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.authRepo.updatePassword(userId, hash);

    await this.authRepo.auditLog({ usuario_id: userId, accion: 'PASSWORD_CHANGED' });
    this.logger.log(`Contraseña cambiada: ${usuario.email}`);
  }

  // ─── ACTIVACIÓN DE CUENTA ────────────────────────────────────

  async activate(rawToken: string, newPassword: string): Promise<void> {
    const hashed = hashToken(rawToken);
    const usuario = await this.authRepo.findByActivationToken(hashed);

    if (!usuario) {
      throw new BadRequestException(
        'El enlace de activación es inválido o ya expiró. Solicitá uno nuevo.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.authRepo.activateAccount(usuario.id, passwordHash);

    await this.authRepo.auditLog({
      usuario_id: usuario.id,
      accion: 'CUENTA_ACTIVADA',
    });

    this.logger.log(`Cuenta activada: ${usuario.email}`);
  }

  async resendActivation(targetUserId: string): Promise<void> {
    const usuario = await this.authRepo.findById(targetUserId);
    if (!usuario) throw new BadRequestException('Usuario no encontrado');
    if (usuario.cuenta_activada) {
      throw new BadRequestException('La cuenta ya está activada');
    }
    if (!usuario.email) {
      throw new BadRequestException('El usuario no tiene email registrado');
    }

    // Rate limit: 1 envío cada 5 minutos
    if (usuario.ultimo_envio_activacion) {
      const msSinceLastSend = Date.now() - new Date(usuario.ultimo_envio_activacion).getTime();
      const cooldownMs = 5 * 60 * 1000;
      if (msSinceLastSend < cooldownMs) {
        const segundosRestantes = Math.ceil((cooldownMs - msSinceLastSend) / 1000);
        throw new HttpException(
          `Esperá ${segundosRestantes} segundos antes de reenviar la invitación`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const { raw, hashed } = this.generateActivationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.authRepo.storeActivationToken(targetUserId, hashed, expiresAt);
    await this.mailer.sendActivationEmail(usuario.email, usuario.nombre, raw);

    this.logger.log(`Activación reenviada a: ${usuario.email}`);
  }

  async adminForceReset(targetUserId: string): Promise<void> {
    const usuario = await this.authRepo.findById(targetUserId);
    if (!usuario) throw new BadRequestException('Usuario no encontrado');
    if (!usuario.email) {
      throw new BadRequestException('El usuario no tiene email registrado');
    }

    const { raw, hashed } = this.generateActivationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.authRepo.storeActivationToken(targetUserId, hashed, expiresAt);
    // Marcar la cuenta como no activada para forzar reset de contraseña
    await this.authRepo.markPendingActivation(targetUserId);
    await this.mailer.sendPasswordResetEmail(usuario.email, usuario.nombre, raw);

    await this.authRepo.auditLog({
      usuario_id: targetUserId,
      accion: 'ADMIN_FORCE_RESET',
    });

    this.logger.warn(`Reset forzado de contraseña para: ${usuario.email}`);
  }

  generateActivationToken(): { raw: string; hashed: string } {
    const raw    = crypto.randomBytes(32).toString('hex');
    const hashed = hashToken(raw);
    return { raw, hashed };
  }

  async disable2FA(userId: string, password: string): Promise<void> {
    const usuario = await this.authRepo.findById(userId);
    if (!usuario) throw new UnauthorizedException();

    const ok = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) throw new UnauthorizedException('Contraseña incorrecta');

    await this.authRepo.disableTotp(userId);
    await this.redis.del(`user:active:${userId}`);
    this.logger.log(`2FA desactivado para usuario: ${userId}`);
  }

  // ─── PRIVADOS ────────────────────────────────────────────────

  private async generateTokenPair(
    usuario: { id: string; institucion_id: string; email: string; roles: string[] },
    meta: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub:   usuario.id,
      inst:  usuario.institucion_id,
      email: usuario.email,
      roles: usuario.roles,
    };

    const accessExpiresIn = this.config.get<string>('auth.jwtAccessExpiresIn', '15m');
    const accessToken = this.jwtService.sign(payload, { expiresIn: accessExpiresIn });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);
    const refreshTtlSeconds = parseSeconds(
      this.config.get<string>('auth.jwtRefreshExpiresIn', '7d'),
    );

    await this.authRepo.saveRefreshToken({
      usuario_id: usuario.id,
      token_hash:  refreshTokenHash,
      user_agent:  meta.userAgent,
      ip:          meta.ip,
      expires_at:  new Date(Date.now() + refreshTtlSeconds * 1000),
    });

    await this.redis.setEx(`refresh:${refreshTokenHash}`, refreshTtlSeconds, usuario.id);

    return {
      access_token:  accessToken,
      refresh_token: refreshToken,
      expires_in:    parseSeconds(accessExpiresIn),
    };
  }

  private async tryRecoveryCode(
    userId: string,
    code: string,
    hashedCodes: string[],
  ): Promise<boolean> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const match = await bcrypt.compare(code.toUpperCase(), hashedCodes[i]);
      if (match) {
        const newCodes = hashedCodes.filter((_, idx) => idx !== i);
        await this.authRepo.updateTotpSecret(userId, '', newCodes);
        this.logger.warn(`Código de recuperación 2FA usado — usuario: ${userId}`);
        return true;
      }
    }
    return false;
  }
}
