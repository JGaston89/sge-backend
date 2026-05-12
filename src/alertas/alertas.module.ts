import { Module } from '@nestjs/common';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';
import { AlertasRepository } from './alertas.repository';

@Module({
  controllers: [AlertasController],
  providers: [AlertasService, AlertasRepository],
})
export class AlertasModule {}
