import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsIn, IsInt, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEspacioDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  nombre: string;

  @ApiProperty({ enum: ['aula', 'laboratorio', 'sum', 'biblioteca', 'patio', 'otro'] })
  @IsIn(['aula', 'laboratorio', 'sum', 'biblioteca', 'patio', 'otro'])
  tipo: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  capacidad?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  piso?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  equipamiento?: string[];
}

export class UpdateEspacioEstadoDto {
  @ApiProperty({ enum: ['disponible', 'mantenimiento', 'inhabilitado'] })
  @IsIn(['disponible', 'mantenimiento', 'inhabilitado'])
  estado: string;
}

export class CreateReservaEspacioDto {
  @ApiProperty({ example: '2026-06-15' })
  @IsString()
  fecha: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  hora_inicio: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  hora_fin: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  nombre_evento?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  motivo?: string;
}

export class CreateMantenimientoDto {
  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  espacio_id?: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  descripcion_problema: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descripcion_equipo?: string;

  @ApiProperty({ enum: ['baja', 'media', 'alta'] })
  @IsIn(['baja', 'media', 'alta'])
  prioridad: string;
}

export class UpdateMantenimientoDto {
  @ApiProperty({ enum: ['pendiente', 'en_proceso', 'resuelto'] })
  @IsIn(['pendiente', 'en_proceso', 'resuelto'])
  estado: string;
}
