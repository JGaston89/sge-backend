import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCircularDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  titulo: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  contenido: string;

  @ApiProperty({ enum: ['circular', 'aviso', 'comunicado'], default: 'circular' })
  @IsIn(['circular', 'aviso', 'comunicado'])
  tipo: string;

  @ApiProperty({ enum: ['todos', 'docentes', 'alumnos', 'administrativos', 'docentes_y_administrativos'], default: 'todos' })
  @IsIn(['todos', 'docentes', 'alumnos', 'administrativos', 'docentes_y_administrativos'])
  destinatarios_tipo: string;

  @ApiProperty({ example: '2026-05-20' })
  @IsDateString()
  fecha_publicacion: string;

  @ApiPropertyOptional({ example: '2026-06-20' })
  @IsOptional() @IsDateString()
  fecha_vencimiento?: string;
}

export class UpdateCircularDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  contenido?: string;

  @ApiPropertyOptional({ enum: ['circular', 'aviso', 'comunicado'] })
  @IsOptional() @IsIn(['circular', 'aviso', 'comunicado'])
  tipo?: string;

  @ApiPropertyOptional({ enum: ['todos', 'docentes', 'alumnos', 'administrativos', 'docentes_y_administrativos'] })
  @IsOptional() @IsIn(['todos', 'docentes', 'alumnos', 'administrativos', 'docentes_y_administrativos'])
  destinatarios_tipo?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  fecha_publicacion?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  fecha_vencimiento?: string;
}
