import { Module } from '@nestjs/common';
import { AltaAcademicaController } from './alta-academica.controller';
import { AltaAcademicaService } from './alta-academica.service';
import { AltaAcademicaRepository } from './alta-academica.repository';

@Module({
  controllers: [AltaAcademicaController],
  providers:   [AltaAcademicaService, AltaAcademicaRepository],
  exports:     [AltaAcademicaService],
})
export class AltaAcademicaModule {}
