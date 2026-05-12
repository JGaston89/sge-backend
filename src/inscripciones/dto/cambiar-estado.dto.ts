import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CambiarEstadoDto {
  @ApiProperty({ enum: ['regular', 'libre', 'baja'] })
  @IsNotEmpty()
  @IsIn(['regular', 'libre', 'baja'])
  estado: 'regular' | 'libre' | 'baja';
}
