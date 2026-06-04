import { Module } from '@nestjs/common';
import { AlumnosController } from './alumnos.controller';
import { AlumnosService } from './alumnos.service';
import { AlumnosRepository } from './alumnos.repository';
import { TutoresRepository } from './tutores.repository';
import { CalificacionesModule } from '../calificaciones/calificaciones.module';
import { DocumentosModule } from '../documentos/documentos.module';
import { InscripcionesModule } from '../inscripciones/inscripciones.module';

@Module({
  imports:     [CalificacionesModule, DocumentosModule, InscripcionesModule],
  controllers: [AlumnosController],
  providers:   [AlumnosService, AlumnosRepository, TutoresRepository],
  exports:     [AlumnosService],
})
export class AlumnosModule {}
