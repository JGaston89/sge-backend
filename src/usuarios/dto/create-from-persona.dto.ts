import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFromPersonaDto {
  @ApiProperty({ description: 'UUID del alumno, docente o administrativo' })
  @IsString()
  personaId: string;

  @ApiProperty({ enum: ['docente', 'alumno', 'administrativo'] })
  @IsIn(['docente', 'alumno', 'administrativo'])
  origen: 'docente' | 'alumno' | 'administrativo';

  @ApiProperty({ enum: ['admin', 'directivo', 'administrativo', 'docente', 'alumno'] })
  @IsIn(['admin', 'directivo', 'administrativo', 'docente', 'alumno'])
  rol: string;
}
