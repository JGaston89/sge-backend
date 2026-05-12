import { IsUUID, IsDateString, IsArray, ValidateNested, IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AsistenciaItemDto {
  @ApiProperty({ description: 'UUID del alumno' })
  @IsUUID()
  alumno_id: string;

  @ApiProperty({ enum: ['presente', 'ausente', 'tardanza', 'justificado'] })
  @IsIn(['presente', 'ausente', 'tardanza', 'justificado'])
  estado: 'presente' | 'ausente' | 'tardanza' | 'justificado';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class RegistrarAsistenciaDto {
  @ApiProperty()
  @IsUUID()
  curso_id: string;

  @ApiProperty()
  @IsUUID()
  materia_id: string;

  @ApiProperty({ example: '2026-05-10' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ type: [AsistenciaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsistenciaItemDto)
  asistencias: AsistenciaItemDto[];
}
