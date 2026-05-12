import { IsUUID, IsInt, IsIn, IsOptional, IsString, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInscripcionDto {
  @ApiProperty({ description: 'UUID del alumno' })
  @IsUUID()
  alumno_id: string;

  @ApiProperty({ description: 'UUID del curso' })
  @IsUUID()
  curso_id: string;

  @ApiProperty({ description: 'Año lectivo (ej: 2026)' })
  @IsInt()
  ciclo_lectivo: number;

  @ApiPropertyOptional({ enum: ['regular', 'libre'], default: 'regular' })
  @IsOptional()
  @IsIn(['regular', 'libre'])
  estado?: 'regular' | 'libre';

  @ApiPropertyOptional({ description: 'Fecha de inscripción (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fecha_inscripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
