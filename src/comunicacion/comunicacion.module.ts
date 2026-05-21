import { Module } from '@nestjs/common';
import { CircularesController } from './circulares/circulares.controller';
import { CircularesService }    from './circulares/circulares.service';
import { CircularesRepository } from './circulares/circulares.repository';

@Module({
  controllers: [CircularesController],
  providers:   [CircularesService, CircularesRepository],
})
export class ComunicacionModule {}
