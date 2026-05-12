import {
  IsString, IsNotEmpty, IsInt, IsOptional, IsUUID,
  IsDateString, IsBoolean, IsIn, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const TIPOS_EVENTO = [
  'feriado_nacional', 'feriado_provincial', 'feriado_institucional',
  'inicio_clases', 'fin_clases', 'receso_invernal', 'receso_primavera',
  'reunion_padres', 'acto_escolar', 'jornada_institucional',
  'periodo_examenes', 'entrega_boletines', 'otro',
] as const;

export type TipoEvento = typeof TIPOS_EVENTO[number];

// ─── Ciclos lectivos ─────────────────────────────────────────

export class CreateCicloDto {
  @ApiProperty({ example: 'Ciclo Lectivo 2026' })
  @IsString() @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 2026 })
  @IsInt() @Min(2000) @Max(2100)
  @Type(() => Number)
  anio: number;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({ example: '2026-12-19' })
  @IsDateString()
  fecha_fin: string;
}

// ─── Eventos ─────────────────────────────────────────────────

export class CreateEventoDto {
  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  ciclo_id?: string;

  @ApiProperty({ example: 'Día del Maestro' })
  @IsString() @IsNotEmpty()
  titulo: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descripcion?: string;

  @ApiProperty({ enum: TIPOS_EVENTO })
  @IsIn(TIPOS_EVENTO)
  tipo: TipoEvento;

  @ApiProperty({ example: '2026-09-11' })
  @IsDateString()
  fecha_inicio: string;

  @ApiPropertyOptional({ example: '2026-09-12' })
  @IsOptional() @IsDateString()
  fecha_fin?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  todo_el_dia?: boolean;
}

// ─── Importar feriados ────────────────────────────────────────

export class ImportarFeriadosDto {
  @ApiProperty({ example: 2026 })
  @IsInt() @Min(2020) @Max(2100)
  @Type(() => Number)
  anio: number;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  ciclo_id?: string;
}
