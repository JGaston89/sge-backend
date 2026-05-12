import { IsUUID, IsInt, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InscripcionMasivaDto {
  @ApiProperty({ description: 'UUID del curso de origen' })
  @IsUUID()
  curso_id_origen: string;

  @ApiProperty({ description: 'UUID del curso de destino' })
  @IsUUID()
  curso_id_destino: string;

  @ApiProperty({ description: 'Ciclo lectivo de origen' })
  @IsInt()
  ciclo_origen: number;

  @ApiProperty({ description: 'Ciclo lectivo de destino' })
  @IsInt()
  ciclo_destino: number;

  @ApiPropertyOptional({ description: 'IDs de alumnos a incluir (vacío = todos los regulares del origen)' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  alumno_ids?: string[];
}
