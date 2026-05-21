import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DocentesService } from './docentes.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateDocenteDto, UpdateDocenteDto, CreateAsignacionDto } from './dto/docentes.dto';

@ApiTags('Docentes')
@ApiBearerAuth()
@Controller('docentes')
export class DocentesController {
  constructor(private readonly service: DocentesService) {}

  // ── Legajos ──────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar legajos docentes' })
  @ApiQuery({ name: 'estado',  required: false })
  @ApiQuery({ name: 'search',  required: false })
  findAll(
    @Query('estado') estado: string,
    @Query('search') search: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(user, { estado: estado || undefined, search: search || undefined });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener legajo de un docente' })
  @ApiParam({ name: 'id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Crear legajo docente' })
  create(
    @Body() dto: CreateDocenteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Actualizar legajo docente' })
  @ApiParam({ name: 'id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocenteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin', 'directivo', 'administrativo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar legajo docente' })
  @ApiParam({ name: 'id' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }

  // ── Asignaciones ─────────────────────────────────────────────

  @Get('asignaciones/list')
  @ApiOperation({ summary: 'Listar asignaciones con filtros opcionales' })
  @ApiQuery({ name: 'docente_id',    required: false })
  @ApiQuery({ name: 'materia_id',    required: false })
  @ApiQuery({ name: 'curso_id',      required: false })
  @ApiQuery({ name: 'ciclo_lectivo', required: false })
  findAsignaciones(
    @Query('docente_id')    docente_id: string,
    @Query('materia_id')    materia_id: string,
    @Query('curso_id')      curso_id: string,
    @Query('ciclo_lectivo') ciclo_lectivo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAsignaciones(user, {
      docente_id:    docente_id    || undefined,
      materia_id:    materia_id    || undefined,
      curso_id:      curso_id      || undefined,
      ciclo_lectivo: ciclo_lectivo ? parseInt(ciclo_lectivo, 10) : undefined,
    });
  }

  @Post('asignaciones')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Crear asignación docente → materia/curso/ciclo' })
  createAsignacion(
    @Body() dto: CreateAsignacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createAsignacion(dto, user);
  }

  @Delete('asignaciones/:id')
  @Roles('admin', 'directivo', 'administrativo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar asignación' })
  @ApiParam({ name: 'id' })
  removeAsignacion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeAsignacion(id, user);
  }
}
