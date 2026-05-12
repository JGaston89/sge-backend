import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsIn,
  IsArray,
  ValidateNested,
  Length,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Contacto de emergencia / tutor ──────────────────────────

export class ContactoEmergenciaDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiProperty({ enum: ['padre', 'madre', 'tutor', 'otro'] })
  @IsIn(['padre', 'madre', 'tutor', 'otro'])
  relacion: 'padre' | 'madre' | 'tutor' | 'otro';

  @ApiPropertyOptional({ example: '11-5555-5555' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @ApiPropertyOptional({ example: 'maria.lopez@mail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

// ─── Alta de alumno ──────────────────────────────────────────

export class CreateAlumnoDto {
  @ApiProperty({ example: '38123456', description: 'DNI sin puntos ni espacios' })
  @IsString()
  @Length(7, 10, { message: 'El DNI debe tener entre 7 y 10 dígitos' })
  @Matches(/^\d+$/, { message: 'El DNI solo puede contener números' })
  dni: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @Length(1, 100)
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @Length(1, 100)
  apellido: string;

  @ApiPropertyOptional({ example: '2010-05-15' })
  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ enum: ['masculino', 'femenino', 'otro', 'no_especificado'] })
  @IsOptional()
  @IsIn(['masculino', 'femenino', 'otro', 'no_especificado'])
  genero?: string;

  @ApiPropertyOptional({ example: 'Argentina' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nacionalidad?: string;

  @ApiPropertyOptional({ example: 'juan.perez@mail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '11-4444-4444' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @ApiPropertyOptional({ example: 'Av. Corrientes 1234, CABA' })
  @IsOptional()
  @IsString()
  domicilio?: string;

  @ApiPropertyOptional({ type: [ContactoEmergenciaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactoEmergenciaDto)
  contactos?: ContactoEmergenciaDto[];
}
