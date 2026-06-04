import {
  IsString, IsOptional, IsDateString, IsIn, Length, MaxLength, Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidEmail } from '../../common/validators/email.validator';
import { IsValidPhone, normalizePhone } from '../../common/validators/phone.validator';

export class CreateAlumnoDto {
  @ApiProperty({ example: '38123456' })
  @IsString()
  @Length(7, 10, { message: 'El DNI debe tener entre 7 y 10 dígitos' })
  @Matches(/^\d+$/, { message: 'El DNI solo puede contener números' })
  dni!: string;

  @ApiProperty({ example: 'Juan' })
  @IsString() @Length(1, 100)
  nombre!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString() @Length(1, 100)
  apellido!: string;

  @ApiPropertyOptional({ example: '2010-05-15' })
  @IsOptional() @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ enum: ['masculino', 'femenino', 'otro', 'no_especificado'] })
  @IsOptional() @IsIn(['masculino', 'femenino', 'otro', 'no_especificado'])
  genero?: string;

  @ApiPropertyOptional({ example: 'Argentina' })
  @IsOptional() @IsString() @MaxLength(60)
  nacionalidad?: string;

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

  // ── Domicilio estructurado ──────────────────────────────────

  @ApiPropertyOptional({ example: 'Av. Corrientes' })
  @IsOptional() @IsString() @MaxLength(200)
  domicilio_calle?: string;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional() @IsString() @MaxLength(20)
  domicilio_numero?: string;

  @ApiPropertyOptional({ example: '3' })
  @IsOptional() @IsString() @MaxLength(10)
  domicilio_piso?: string;

  @ApiPropertyOptional({ example: 'B' })
  @IsOptional() @IsString() @MaxLength(20)
  domicilio_torre?: string;

  @ApiPropertyOptional({ example: '4B' })
  @IsOptional() @IsString() @MaxLength(20)
  domicilio_depto?: string;

  @ApiPropertyOptional({ example: 'Buenos Aires' })
  @IsOptional() @IsString() @MaxLength(100)
  localidad?: string;

  @ApiPropertyOptional({ example: 'Buenos Aires' })
  @IsOptional() @IsString() @MaxLength(100)
  provincia?: string;

  @ApiPropertyOptional({ example: '1043' })
  @IsOptional() @IsString() @MaxLength(10)
  codigo_postal?: string;
}
