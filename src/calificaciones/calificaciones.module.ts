import { Module } from '@nestjs/common';
import { CalificacionesController } from './calificaciones.controller';
import { CalificacionesService }    from './calificaciones.service';
import { CalificacionesRepository } from './calificaciones.repository';
import { PdfModule }                from '../pdf/pdf.module';

@Module({
  imports:     [PdfModule],
  controllers: [CalificacionesController],
  providers:   [CalificacionesService, CalificacionesRepository],
  exports:     [CalificacionesService],
})
export class CalificacionesModule {}
