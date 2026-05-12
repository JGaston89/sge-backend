import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const TIPOS_DOCUMENTO = [
  'dni',
  'partida_nacimiento',
  'libreta_sanitaria',
  'certificado_medico',
  'foto',
  'constancia_domicilio',
  'vacunas',
  'beca',
  'otro',
] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export class UploadDocumentoDto {
  @ApiProperty({ enum: TIPOS_DOCUMENTO, description: 'Tipo de documento' })
  @IsString()
  @IsIn(TIPOS_DOCUMENTO)
  tipo_documento: TipoDocumento;
}
