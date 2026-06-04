import {
  IsString, IsOptional, IsBoolean, IsIn, MaxLength, IsHexColor, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class UpdatePerfilInstitucionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300)
  motto?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  descripcion?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  email_contacto?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  telefono_contacto?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  sitio_web?: string;

  @ApiPropertyOptional({ example: '#1e3a5f' })
  @IsOptional() @IsHexColor()
  color_primario?: string;

  @ApiPropertyOptional({ example: '#f59e0b' })
  @IsOptional() @IsHexColor()
  color_secundario?: string;

  @ApiPropertyOptional({ example: { facebook: 'https://...', instagram: 'https://...' } })
  @IsOptional()
  redes_sociales?: Record<string, string>;

  @ApiPropertyOptional() @IsOptional() @IsString()
  logo_url?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  banner_url?: string;
}

export class ArchivoNoticiaDto {
  @IsString() nombre: string;
  @IsString() url: string;
  @IsString() s3_key: string;
  @IsString() mime_type: string;
  @IsOptional() tamano_bytes?: number;
}

export class CreateNoticiaDto {
  @ApiProperty() @IsString() @MaxLength(300)
  titulo: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  resumen?: string;

  @ApiProperty() @IsString()
  contenido: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  imagen_url?: string;

  @ApiPropertyOptional({ enum: ['noticia','evento','deporte','logro','comunicado','general'] })
  @IsOptional()
  @IsIn(['noticia','evento','deporte','logro','comunicado','general'])
  categoria?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  destacada?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  publicada?: boolean;

  @ApiPropertyOptional({ type: [ArchivoNoticiaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArchivoNoticiaDto)
  archivos?: ArchivoNoticiaDto[];
}

export class UpdateNoticiaDto extends PartialType(CreateNoticiaDto) {}

export class QueryNoticiasDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  categoria?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  destacada?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString()
  q?: string;
}
