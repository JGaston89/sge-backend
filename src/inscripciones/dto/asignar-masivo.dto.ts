import { IsUUID, IsInt, IsIn, IsOptional, IsString, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AsignarMasivoDto {
  @ApiProperty({ description: 'UUID del curso destino' })
  @IsUUID()
  curso_id: string;

  @ApiProperty({ description: 'Año lectivo (ej: 2026)' })
  @IsInt()
  ciclo_lectivo: number;

  @ApiProperty({ description: 'UUIDs de los alumnos a inscribir', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  alumno_ids: string[];

  @ApiPropertyOptional({ enum: ['regular', 'libre'], default: 'regular' })
  @IsOptional()
  @IsIn(['regular', 'libre'])
  estado?: 'regular' | 'libre';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
