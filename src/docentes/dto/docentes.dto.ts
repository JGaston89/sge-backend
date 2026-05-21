import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsArray,
  IsUUID,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidEmail } from '../../common/validators/email.validator';
import { IsValidPhone, normalizePhone } from '../../common/validators/phone.validator';

// ─── Alta de docente ─────────────────────────────────────────

export class CreateDocenteDto {
  @ApiPropertyOptional({ description: 'UUID de usuario existente para vincular' })
  @IsOptional()
  @IsUUID('4')
  usuario_id?: string;

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'Gómez' })
  @IsString()
  @MaxLength(100)
  apellido: string;

  @ApiPropertyOptional({ example: '25123456' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string;

  @ApiPropertyOptional({ example: 'carlos.gomez@escuela.edu.ar' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsValidEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+54 9 11 1234-5678' })
  @IsOptional()
  @Transform(({ value }) => normalizePhone(value))
  @IsValidPhone()
  telefono?: string;

  @ApiPropertyOptional({ example: 'Profesor en Matemáticas' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional({ example: ['Álgebra', 'Geometría'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  especialidades?: string[];

  @ApiPropertyOptional({ example: '2018-03-01' })
  @IsOptional()
  @IsDateString()
  fecha_ingreso?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

// ─── Edición de docente ──────────────────────────────────────

export class UpdateDocenteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  usuario_id?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  especialidades?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_ingreso?: string | null;

  @ApiPropertyOptional({ enum: ['activo', 'inactivo', 'licencia'] })
  @IsOptional()
  @IsIn(['activo', 'inactivo', 'licencia'])
  estado?: 'activo' | 'inactivo' | 'licencia';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

// ─── Asignación docente–materia–curso ────────────────────────

export class CreateAsignacionDto {
  @ApiProperty()
  @IsUUID('4')
  docente_id: string;

  @ApiProperty()
  @IsUUID('4')
  materia_id: string;

  @ApiProperty()
  @IsUUID('4')
  curso_id: string;

  @ApiProperty({ example: 2025 })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  ciclo_lectivo: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(40)
  horas_semanales?: number;
}

export class UpdateAsignacionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(40)
  horas_semanales?: number;
}
