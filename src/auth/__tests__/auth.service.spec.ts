import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { REDIS_CLIENT } from '../../database/redis.module';

// ─── Mocks ───────────────────────────────────────────────────

const mockAuthRepo = {
  findByEmail:              jest.fn(),
  findById:                 jest.fn(),
  registerFailedAttempt:    jest.fn(),
  resetFailedAttempts:      jest.fn(),
  saveRefreshToken:         jest.fn(),
  findRefreshToken:         jest.fn(),
  revokeRefreshToken:       jest.fn(),
  revokeAllUserRefreshTokens: jest.fn(),
  updateTotpSecret:         jest.fn(),
  disableTotp:              jest.fn(),
  updatePassword:           jest.fn(),
  auditLog:                 jest.fn(),
};

const mockRedis = {
  incr:   jest.fn(),
  expire: jest.fn(),
  del:    jest.fn(),
  get:    jest.fn(),
  set:    jest.fn(),
  setEx:  jest.fn(),
  exists: jest.fn(),
};

const mockJwtService = {
  sign:   jest.fn().mockReturnValue('mock.access.token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, def?: unknown) => {
    const cfg: Record<string, unknown> = {
      'auth.throttleTtl':          900_000,
      'auth.throttleLimit':        5,
      'auth.jwtAccessExpiresIn':   '15m',
      'auth.jwtRefreshExpiresIn':  '7d',
      'auth.otpIssuer':            'SGE-Test',
    };
    return cfg[key] ?? def;
  }),
};

// ─── Usuario de prueba ────────────────────────────────────────

const plainPassword = 'Password123!';
const mockUsuario = {
  id:                'user-uuid-1',
  institucion_id:    'inst-uuid-1',
  email:             'docente@escuela.edu.ar',
  password_hash:     bcrypt.hashSync(plainPassword, 10),
  nombre:            'Ana',
  apellido:          'García',
  avatar_url:        null,
  totp_secret:       null,
  totp_activo:       false,
  recovery_codes:    null,
  activo:            true,
  primer_acceso:     false,
  intentos_fallidos: 0,
  bloqueado_hasta:   null,
  ultimo_acceso:     null,
  roles:             ['docente'],
};

const META = { ip: '127.0.0.1', userAgent: 'jest' };

// ─── Suite de tests ───────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository,  useValue: mockAuthRepo },
        { provide: JwtService,      useValue: mockJwtService },
        { provide: ConfigService,   useValue: mockConfigService },
        { provide: REDIS_CLIENT,    useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();

    // Defaults
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(true);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.setEx.mockResolvedValue('OK');
    mockAuthRepo.auditLog.mockResolvedValue(undefined);
    mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);
    mockAuthRepo.resetFailedAttempts.mockResolvedValue(undefined);
  });

  // ── LOGIN ──────────────────────────────────────────────────

  describe('login()', () => {
    it('devuelve tokens y datos del usuario en login exitoso', async () => {
      mockAuthRepo.findByEmail.mockResolvedValue(mockUsuario);

      const result = await service.login(
        { email: mockUsuario.email, password: plainPassword, institucion_id: 'inst-uuid-1' },
        META,
      );

      expect(result.access_token).toBe('mock.access.token');
      expect(result.refresh_token).toBeDefined();
      expect(result.usuario.email).toBe(mockUsuario.email);
      expect(result.usuario.roles).toEqual(['docente']);
      expect(mockAuthRepo.resetFailedAttempts).toHaveBeenCalledWith('user-uuid-1');
      expect(mockAuthRepo.auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'LOGIN_SUCCESS' }),
      );
    });

    it('lanza UnauthorizedException si el email no existe', async () => {
      mockAuthRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'pass', institucion_id: 'inst-1' }, META),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException y registra intento fallido con contraseña incorrecta', async () => {
      mockAuthRepo.findByEmail.mockResolvedValue(mockUsuario);
      mockAuthRepo.registerFailedAttempt.mockResolvedValue(undefined);

      await expect(
        service.login(
          { email: mockUsuario.email, password: 'WrongPass!', institucion_id: 'inst-uuid-1' },
          META,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthRepo.registerFailedAttempt).toHaveBeenCalledWith('user-uuid-1');
      expect(mockAuthRepo.auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'LOGIN_FAILED' }),
      );
    });

    it('lanza ForbiddenException si la cuenta está bloqueada', async () => {
      mockAuthRepo.findByEmail.mockResolvedValue({
        ...mockUsuario,
        bloqueado_hasta: new Date(Date.now() + 10 * 60 * 1000),
      });

      await expect(
        service.login(
          { email: mockUsuario.email, password: plainPassword, institucion_id: 'inst-uuid-1' },
          META,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si el usuario está inactivo', async () => {
      mockAuthRepo.findByEmail.mockResolvedValue({ ...mockUsuario, activo: false });

      await expect(
        service.login(
          { email: mockUsuario.email, password: plainPassword, institucion_id: 'inst-uuid-1' },
          META,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza UnauthorizedException si se supera el rate limit de IP', async () => {
      mockRedis.incr.mockResolvedValue(99);

      await expect(
        service.login(
          { email: mockUsuario.email, password: plainPassword, institucion_id: 'inst-uuid-1' },
          META,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si 2FA está activo y no se provee código', async () => {
      mockAuthRepo.findByEmail.mockResolvedValue({
        ...mockUsuario,
        totp_activo: true,
        totp_secret: 'JBSWY3DPEHPK3PXP',
      });

      await expect(
        service.login(
          { email: mockUsuario.email, password: plainPassword, institucion_id: 'inst-uuid-1' },
          META,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── REFRESH ────────────────────────────────────────────────

  describe('refresh()', () => {
    it('rota el token y emite nuevos tokens con hit en Redis', async () => {
      mockRedis.get.mockResolvedValue('user-uuid-1');
      mockAuthRepo.findById.mockResolvedValue(mockUsuario);
      mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.refresh('valid-refresh-token', META);

      expect(result.access_token).toBe('mock.access.token');
      expect(result.refresh_token).toBeDefined();
      expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalled();
      expect(mockAuthRepo.saveRefreshToken).toHaveBeenCalled();
    });

    it('lanza UnauthorizedException con token no encontrado en Redis ni BD', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockAuthRepo.findRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('bad-token', META)).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException con token revocado en BD', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockAuthRepo.findRefreshToken.mockResolvedValue({
        usuario_id: 'user-uuid-1',
        expires_at:  new Date(Date.now() + 10_000),
        revoked:     true,
      });

      await expect(service.refresh('revoked-token', META)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── LOGOUT ────────────────────────────────────────────────

  describe('logout()', () => {
    it('revoca el refresh token y agrega el access token a la blacklist', async () => {
      mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);

      await service.logout('refresh-tok', 'access-tok', 'user-uuid-1');

      expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalled();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining('blacklist:'),
        expect.any(Number),
        '1',
      );
      expect(mockAuthRepo.auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'LOGOUT' }),
      );
    });
  });

  // ── 2FA ───────────────────────────────────────────────────

  describe('verify2FA()', () => {
    it('lanza BadRequestException si no hay secreto pendiente en Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.verify2FA('user-uuid-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
