import {
  IsEmail,
  IsString,
  IsUUID,
  IsOptional,
  Length,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Login ───────────────────────────────────────────────────

export class LoginDto {
  @ApiProperty({ example: 'docente@escuela.edu.ar' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(1, { message: 'La contraseña es requerida' })
  password: string;

  @ApiProperty({ example: 'uuid-de-la-institucion' })
  @IsUUID('4', { message: 'ID de institución inválido' })
  institucion_id: string;

  @ApiPropertyOptional({ example: '123456', description: 'Código TOTP (si 2FA está activo)' })
  @IsOptional()
  @Length(6, 6, { message: 'El código 2FA debe tener exactamente 6 dígitos' })
  totp_code?: string;
}

// ─── Refresh ─────────────────────────────────────────────────

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  refresh_token: string;
}

// ─── Logout ──────────────────────────────────────────────────

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  refresh_token: string;
}

// ─── Cambio de contraseña ────────────────────────────────────

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  current_password: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
  })
  new_password: string;
}

// ─── Activación de cuenta ────────────────────────────────────

export class ActivateAccountDto {
  @ApiProperty({ example: 'a3f9...raw-token', description: 'Token raw recibido por email' })
  @IsString()
  @MinLength(64)
  token: string;

  @ApiProperty({ example: 'MiPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
  })
  password: string;
}

// ─── 2FA ─────────────────────────────────────────────────────

export class Verify2FADto {
  @ApiProperty({ example: '123456' })
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  totp_code: string;
}

export class Disable2FADto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}
