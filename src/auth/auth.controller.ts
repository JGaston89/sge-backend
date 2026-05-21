import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import {
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
  ChangePasswordDto,
  Verify2FADto,
  Disable2FADto,
  ActivateAccountDto,
} from './dto/auth.dto';
import { Roles } from '../common/decorators/roles.decorator';

function getMeta(req: Request) {
  const forwarded = req.headers['x-forwarded-for'] as string | undefined;
  return {
    ip:        forwarded?.split(',')[0]?.trim() ?? req.ip,
    userAgent: req.headers['user-agent'],
  };
}

function getAccessToken(req: Request): string {
  return (req.headers.authorization ?? '').replace('Bearer ', '');
}

@ApiTags('Autenticación')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── PÚBLICOS ─────────────────────────────────────────────

  @Public()
  @Get('instituciones')
  @ApiOperation({ summary: 'Listar instituciones disponibles para el login' })
  @ApiResponse({ status: 200, description: 'Lista de instituciones activas' })
  getInstituciones() {
    return this.authService.getInstituciones();
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso — devuelve tokens' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, getMeta(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token' })
  @ApiResponse({ status: 200, description: 'Nuevos tokens emitidos' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refresh_token, getMeta(req));
  }

  // ─── PROTEGIDOS ───────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Datos del usuario autenticado' })
  async me(@CurrentUser() user: JwtPayload) {
    const usuario = await this.authService.getUser(user.sub);
    return {
      id:             user.sub,
      email:          user.email,
      nombre:         usuario?.nombre ?? '',
      apellido:       usuario?.apellido ?? '',
      institucion_id: user.inst,
      roles:          user.roles,
      primer_acceso:  usuario?.primer_acceso ?? false,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión actual' })
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    await this.authService.logout(dto.refresh_token, getAccessToken(req), userId);
    return { message: 'Sesión cerrada correctamente' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar todas las sesiones activas' })
  async logoutAll(@CurrentUser('sub') userId: string, @Req() req: Request) {
    await this.authService.logoutAll(userId, getAccessToken(req));
    return { message: 'Todas las sesiones cerradas correctamente' };
  }

  // ─── CAMBIO DE CONTRASEÑA ─────────────────────────────────

  @Post('update-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña (requiere contraseña actual)' })
  async updatePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser('sub') userId: string,
  ) {
    await this.authService.changePassword(userId, dto.current_password, dto.new_password);
    return { message: 'Contraseña actualizada correctamente' };
  }

  // ─── ACTIVACIÓN DE CUENTA ─────────────────────────────────

  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar cuenta con token de email y establecer contraseña' })
  async activate(@Body() dto: ActivateAccountDto) {
    await this.authService.activate(dto.token, dto.password);
    return { message: 'Cuenta activada correctamente. Ya podés iniciar sesión.' };
  }

  @Post('resend-activation/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reenviar email de activación (admin/directivo)' })
  async resendActivation(@Param('id') id: string) {
    await this.authService.resendActivation(id);
    return { message: 'Email de activación reenviado correctamente' };
  }

  @Post('admin-reset/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Forzar reset de contraseña (admin/directivo)' })
  async adminForceReset(@Param('id') id: string) {
    await this.authService.adminForceReset(id);
    return { message: 'Se envió un enlace de restablecimiento de contraseña' };
  }

  // ─── 2FA ──────────────────────────────────────────────────

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar QR para configurar 2FA' })
  setup2FA(@CurrentUser() user: JwtPayload) {
    return this.authService.setup2FA(user.sub, user.email);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirmar código TOTP y activar 2FA' })
  async verify2FA(@Body() dto: Verify2FADto, @CurrentUser('sub') userId: string) {
    const recoveryCodes = await this.authService.verify2FA(userId, dto.totp_code);
    return {
      message: '2FA activado. Guardá estos códigos de recuperación en un lugar seguro.',
      recovery_codes: recoveryCodes,
    };
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desactivar 2FA' })
  async disable2FA(@Body() dto: Disable2FADto, @CurrentUser('sub') userId: string) {
    await this.authService.disable2FA(userId, dto.password);
    return { message: '2FA desactivado correctamente' };
  }
}
