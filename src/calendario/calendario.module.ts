import { Module } from '@nestjs/common';
import { CalendarioController } from './calendario.controller';
import { CalendarioService }    from './calendario.service';
import { CalendarioRepository } from './calendario.repository';

@Module({
  controllers: [CalendarioController],
  providers:   [CalendarioService, CalendarioRepository],
  exports:     [CalendarioService],
})
export class CalendarioModule {}
