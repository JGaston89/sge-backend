import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAlumnosDto {
  @ApiPropertyOptional({ description: 'Búsqueda full-text por nombre, apellido o DNI' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['activo', 'baja', 'egresado'] })
  @IsOptional()
  @IsIn(['activo', 'baja', 'egresado'])
  estado?: 'activo' | 'baja' | 'egresado';

  @ApiPropertyOptional({ description: 'Cursor opaco devuelto por la respuesta anterior' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
