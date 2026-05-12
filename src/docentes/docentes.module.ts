import { Module } from '@nestjs/common';
import { DocentesController } from './docentes.controller';
import { DocentesService } from './docentes.service';
import { DocentesRepository } from './docentes.repository';

@Module({
  controllers: [DocentesController],
  providers:   [DocentesService, DocentesRepository],
  exports:     [DocentesService],
})
export class DocentesModule {}
