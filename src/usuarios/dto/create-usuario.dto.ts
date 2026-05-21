import { IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidEmail } from '../../common/validators/email.validator';

const ROLES_VALIDOS = ['admin', 'directivo', 'administrativo', 'docente', 'alumno'];

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  apellido: string;

  @ApiProperty({ example: 'juan.perez@escuela.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsValidEmail()
  email: string;

  @ApiProperty({ enum: ROLES_VALIDOS })
  @IsIn(ROLES_VALIDOS)
  rol: string;
}
