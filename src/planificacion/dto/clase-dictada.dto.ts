import { IsUUID, IsDateString, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClaseDictadaDto {
  @ApiProperty()
  @IsUUID()
  planificacion_id: string;

  @ApiPropertyOptional({ description: 'UUID de legajos_docentes (opcional)' })
  @IsOptional() @IsUUID()
  docente_id?: string;

  @ApiProperty({ example: '2026-05-12' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: 'Fracciones propias e impropias. Ejercicios prácticos.' })
  @IsString() @IsNotEmpty()
  contenidos_trabajados: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observaciones?: string;
}
