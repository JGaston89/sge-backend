import {
  IsUUID, IsDateString, IsOptional, IsString, IsInt,
  IsArray, ValidateNested, IsNumber, IsIn, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Mesas ───────────────────────────────────────────────────

export class CreateMesaDto {
  @ApiProperty()
  @IsUUID()
  materia_id: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  ciclo_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  docente_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  curso_id?: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional() @IsString()
  hora?: string;

  @ApiPropertyOptional({ example: 'Aula 3' })
  @IsOptional() @IsString()
  aula?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  cupo_maximo?: number;

  @ApiPropertyOptional({ example: '2026-07-13' })
  @IsOptional() @IsDateString()
  fecha_limite_inscripcion?: string;
}

// ─── Inscripción ─────────────────────────────────────────────

export class InscribirAlumnoDto {
  @ApiProperty()
  @IsUUID()
  alumno_id: string;
}

// ─── Carga de notas ──────────────────────────────────────────

export class NotaItemDto {
  @ApiProperty()
  @IsUUID()
  alumno_id: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10 })
  @IsOptional() @IsNumber() @Min(1) @Max(10)
  @Type(() => Number)
  nota_numerica?: number;

  @ApiProperty({ enum: ['presente', 'ausente', 'inscripto'] })
  @IsIn(['presente', 'ausente', 'inscripto'])
  estado: 'presente' | 'ausente' | 'inscripto';

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observaciones?: string;
}

export class CargarNotasDto {
  @ApiProperty({ type: [NotaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotaItemDto)
  items: NotaItemDto[];
}
