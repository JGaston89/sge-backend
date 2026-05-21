import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService }    from './usuarios.service';
import { UsuariosRepository } from './usuarios.repository';
import { DatabaseModule }     from '../database/database.module';

@Module({
  imports:     [DatabaseModule],
  controllers: [UsuariosController],
  providers:   [UsuariosService, UsuariosRepository],
})
export class UsuariosModule {}
