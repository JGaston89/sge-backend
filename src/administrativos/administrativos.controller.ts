import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdministrativosService } from './administrativos.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateAdministrativoDto, UpdateAdministrativoDto } from './dto/administrativos.dto';

@ApiTags('Administrativos')
@ApiBearerAuth()
@Controller('administrativos')
export class AdministrativosController {
  constructor(private readonly service: AdministrativosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar personal administrativo' })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('estado') estado: string,
    @Query('search') search: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(user, { estado: estado || undefined, search: search || undefined });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener legajo de un administrativo' })
  @ApiParam({ name: 'id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('admin', 'directivo')
  @ApiOperation({ summary: 'Crear legajo de personal administrativo' })
  create(
    @Body() dto: CreateAdministrativoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('admin', 'directivo')
  @ApiOperation({ summary: 'Actualizar legajo de personal administrativo' })
  @ApiParam({ name: 'id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdministrativoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin', 'directivo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar legajo (solo si no tiene cuenta de usuario)' })
  @ApiParam({ name: 'id' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }
}
