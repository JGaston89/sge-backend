import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CreateFromPersonaDto } from './dto/create-from-persona.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Listado unificado: cuentas del sistema + docentes sin cuenta + alumnos sin cuenta' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user);
  }

  @Get('sistema')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Cuentas con roles de gestión: admin, directivo, administrativo' })
  findSistema(@CurrentUser() user: JwtPayload) {
    return this.service.findSistema(user);
  }

  @Get('pendientes')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Usuarios con cuenta pendiente de activación' })
  findPendientes(@CurrentUser() user: JwtPayload) {
    return this.service.findPendientes(user);
  }

  @Delete(':id/pendiente')
  @Roles('admin', 'directivo')
  @ApiOperation({ summary: 'Cancelar (soft delete) una cuenta pendiente de activación' })
  @ApiParam({ name: 'id' })
  cancelarPendiente(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cancelarPendiente(id, user);
  }

  @Post()
  @Roles('admin', 'directivo')
  @ApiOperation({ summary: 'Crear e invitar usuario directamente (sin persona origen)' })
  create(
    @Body() dto: CreateUsuarioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Post('from-persona')
  @Roles('admin', 'directivo')
  @ApiOperation({ summary: 'Invitar al sistema a un alumno, docente o administrativo existente' })
  createFromPersona(
    @Body() dto: CreateFromPersonaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createFromPersona(dto, user);
  }

  @Patch(':id')
  @Roles('admin', 'directivo')
  @ApiOperation({ summary: 'Actualizar datos o rol de un usuario existente' })
  @ApiParam({ name: 'id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }
}
