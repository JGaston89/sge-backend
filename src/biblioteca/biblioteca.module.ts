import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BibliotecaController } from './biblioteca.controller';
import { BibliotecaService } from './biblioteca.service';
import { BibliotecaRepository } from './biblioteca.repository';

@Module({
  imports:     [ConfigModule],
  controllers: [BibliotecaController],
  providers:   [BibliotecaService, BibliotecaRepository],
})
export class BibliotecaModule {}
