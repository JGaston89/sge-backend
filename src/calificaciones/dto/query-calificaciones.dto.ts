import { IsUUID, IsString, IsOptional, IsInt, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCalificacionesDto {
  @ApiProperty({ description: 'UUID del curso/sección' })
  @IsUUID('4')
  curso_id: string;

  @ApiProperty({ description: 'UUID de la materia' })
  @IsUUID('4')
  materia_id: string;

  @ApiProperty({ example: '1er trimestre', description: 'Período (trimestre, cuatrimestre, etc.)' })
  @IsString()
  @MinLength(1)
  periodo: string;

  @ApiPropertyOptional({ example: 2026, description: 'Año académico (defecto: año actual)' })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  anio_academico?: number;
}
