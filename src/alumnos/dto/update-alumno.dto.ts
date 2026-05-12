import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAlumnoDto } from './create-alumno.dto';

// El DNI es inmutable tras el alta — se omite del update
export class UpdateAlumnoDto extends PartialType(
  OmitType(CreateAlumnoDto, ['dni'] as const),
) {}
