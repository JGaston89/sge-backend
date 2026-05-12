import { Module } from '@nestjs/common';
import { AsistenciasController } from './asistencias.controller';
import { AsistenciasService } from './asistencias.service';
import { AsistenciasRepository } from './asistencias.repository';

@Module({
  controllers: [AsistenciasController],
  providers:   [AsistenciasService, AsistenciasRepository],
  exports:     [AsistenciasService],
})
export class AsistenciasModule {}
