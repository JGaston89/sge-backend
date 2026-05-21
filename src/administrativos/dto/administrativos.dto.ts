import { IsString, IsOptional, IsDateString, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidEmail } from '../../common/validators/email.validator';
import { IsValidPhone, normalizePhone } from '../../common/validators/phone.validator';

export class CreateAdministrativoDto {
  @ApiProperty({ example: 'Laura' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'González' })
  @IsString()
  apellido: string;

  @ApiPropertyOptional({ example: '30123456' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string;

  @ApiPropertyOptional({ example: 'laura.gonzalez@escuela.com' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsValidEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+54 9 11 1234-5678' })
  @IsOptional()
  @Transform(({ value }) => normalizePhone(value))
  @IsValidPhone()
  telefono?: string;

  @ApiPropertyOptional({ example: 'Secretaria académica' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargo?: string;

  @ApiPropertyOptional({ example: '2022-03-01' })
  @IsOptional()
  @IsDateString()
  fecha_ingreso?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateAdministrativoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apellido?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_ingreso?: string | null;

  @ApiPropertyOptional({ enum: ['activo', 'inactivo'] })
  @IsOptional()
  @IsIn(['activo', 'inactivo'])
  estado?: 'activo' | 'inactivo';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
