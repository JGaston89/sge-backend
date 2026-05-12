import {
  IsUUID, IsString, IsOptional, IsEnum,
  IsInt, Min, Max, MinLength, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type TipoCalificacion = 'nota' | 'parcial' | 'final' | 'recuperatorio' | 'concepto';

export class CreateCalificacionDto {
  @ApiProperty({ description: 'UUID del curso' })
  @IsUUID('4')
  curso_id: string;

  @ApiProperty({ description: 'UUID de la materia' })
  @IsUUID('4')
  materia_id: string;

  @ApiProperty({ example: '1er trimestre' })
  @IsString()
  @MinLength(1)
  periodo: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  anio_academico?: number;

  @ApiProperty({ description: 'UUID del alumno' })
  @IsUUID('4')
  alumno_id: string;

  @ApiPropertyOptional({ enum: ['nota', 'parcial', 'final', 'recuperatorio', 'concepto'], default: 'nota' })
  @IsOptional()
  @IsEnum(['nota', 'parcial', 'final', 'recuperatorio', 'concepto'])
  tipo?: TipoCalificacion;

  @ApiProperty({ example: '7', description: 'Valor de la nota (numérico o conceptual: MB, B, R, I)' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  nota_valor: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
