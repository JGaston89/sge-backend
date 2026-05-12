import { Module } from '@nestjs/common';
import { PlanificacionController } from './planificacion.controller';
import { PlanificacionService } from './planificacion.service';
import { PlanificacionRepository } from './planificacion.repository';

@Module({
  controllers: [PlanificacionController],
  providers:   [PlanificacionService, PlanificacionRepository],
  exports:     [PlanificacionService],
})
export class PlanificacionModule {}
