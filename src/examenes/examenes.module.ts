import { Module } from '@nestjs/common';
import { ExamenesController } from './examenes.controller';
import { ExamenesService }    from './examenes.service';
import { ExamenesRepository } from './examenes.repository';

@Module({
  controllers: [ExamenesController],
  providers:   [ExamenesService, ExamenesRepository],
  exports:     [ExamenesService],
})
export class ExamenesModule {}
