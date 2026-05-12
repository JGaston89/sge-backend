import { Module } from '@nestjs/common';
import { ActasController } from './actas.controller';
import { CalificacionesModule } from '../calificaciones/calificaciones.module';

@Module({
  imports:     [CalificacionesModule],
  controllers: [ActasController],
})
export class ActasModule {}
