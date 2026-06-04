import { IsString, IsOptional, IsDateString, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidEmail } from '../../common/validators/email.validator';
import { IsValidPhone, normalizePhone } from '../../common/validators/phone.validator';

export class CreateAdministrativoDto {
  @ApiProperty({ example: 'Laura' })
  @IsString()
  nombre!: string;

  @ApiProperty({ example: 'González' })
  @IsString()
  apellido!: string;

  @ApiPropertyOptional({ example: '30123456' })
  @IsOptional() @IsString() @MaxLength(20)
  dni?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsValidEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizePhone(value))
  @IsValidPhone()
  telefono?: string;

  @ApiPropertyOptional({ example: '1985-06-15' })
  @IsOptional() @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ enum: ['masculino', 'femenino', 'otro', 'no_especificado'] })
  @IsOptional() @IsIn(['masculino', 'femenino', 'otro', 'no_especificado'])
  genero?: string;

  @ApiPropertyOptional({ example: 'Argentina' })
  @IsOptional() @IsString() @MaxLength(60)
  nacionalidad?: string;

  // ── Domicilio ────────────────────────────────────────────────

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  domicilio_calle?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  domicilio_numero?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  domicilio_piso?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  domicilio_torre?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  domicilio_depto?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  localidad?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  provincia?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  codigo_postal?: string;

  @ApiPropertyOptional({ example: 'Secretaria académica' })
  @IsOptional() @IsString() @MaxLength(100)
  cargo?: string;

  @ApiPropertyOptional({ example: '2022-03-01' })
  @IsOptional() @IsDateString()
  fecha_ingreso?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observaciones?: string;
}

export class UpdateAdministrativoDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  nombre?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  apellido?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  dni?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsValidEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizePhone(value))
  @IsValidPhone()
  telefono?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  fecha_nacimiento?: string | null;

  @ApiPropertyOptional({ enum: ['masculino', 'femenino', 'otro', 'no_especificado'] })
  @IsOptional() @IsIn(['masculino', 'femenino', 'otro', 'no_especificado'])
  genero?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60)
  nacionalidad?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  domicilio_calle?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  domicilio_numero?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  domicilio_piso?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  domicilio_torre?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  domicilio_depto?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  localidad?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  provincia?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  codigo_postal?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  cargo?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  fecha_ingreso?: string | null;

  @ApiPropertyOptional({ enum: ['activo', 'inactivo'] })
  @IsOptional() @IsIn(['activo', 'inactivo'])
  estado?: 'activo' | 'inactivo';

  @ApiPropertyOptional() @IsOptional() @IsString()
  observaciones?: string;
}
