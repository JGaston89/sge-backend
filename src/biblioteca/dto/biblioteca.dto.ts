import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaterialEstudioDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  titulo: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  docente_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  curso_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  materia_id?: string;

  @ApiPropertyOptional({ description: 'Temas del examen que cubre el material' })
  @IsOptional() @IsString()
  temas?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descripcion?: string;
}

export class UpdateMaterialEstudioDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  docente_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  curso_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  materia_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  temas?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descripcion?: string;
}
