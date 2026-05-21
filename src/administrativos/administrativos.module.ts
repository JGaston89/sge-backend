import { Module } from '@nestjs/common';
import { AdministrativosController } from './administrativos.controller';
import { AdministrativosService } from './administrativos.service';
import { AdministrativosRepository } from './administrativos.repository';

@Module({
  controllers: [AdministrativosController],
  providers:   [AdministrativosService, AdministrativosRepository],
  exports:     [AdministrativosService],
})
export class AdministrativosModule {}
