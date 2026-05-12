import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CerrarActaDto {
  @ApiPropertyOptional({ description: 'Observaciones al momento del cierre' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
