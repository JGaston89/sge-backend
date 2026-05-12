import { Module } from '@nestjs/common';
import { EspaciosController } from './espacios.controller';
import { EspaciosService } from './espacios.service';
import { EspaciosRepository } from './espacios.repository';

@Module({
  controllers: [EspaciosController],
  providers:   [EspaciosService, EspaciosRepository],
  exports:     [EspaciosRepository],
})
export class EspaciosModule {}
