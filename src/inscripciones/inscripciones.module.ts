import { Module } from '@nestjs/common';
import { InscripcionesController } from './inscripciones.controller';
import { InscripcionesService } from './inscripciones.service';
import { InscripcionesRepository } from './inscripciones.repository';

@Module({
  controllers: [InscripcionesController],
  providers:   [InscripcionesService, InscripcionesRepository],
  exports:     [InscripcionesService],
})
export class InscripcionesModule {}
