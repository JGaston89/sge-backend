import { IsString, IsOptional, IsDateString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BajaAlumnoDto {
  @ApiProperty({ example: 'Traslado a otra institución' })
  @IsString()
  @Length(3, 500, { message: 'El motivo debe tener entre 3 y 500 caracteres' })
  motivo: string;

  @ApiPropertyOptional({
    example: '2025-07-31',
    description: 'Fecha efectiva de baja. Por defecto: hoy',
  })
  @IsOptional()
  @IsDateString()
  fecha_baja?: string;
}
