import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AltaAcademicaService } from './alta-academica.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Alta Académica')
@ApiBearerAuth()
@Controller('alta-academica')
export class AltaAcademicaController {
  constructor(private readonly service: AltaAcademicaService) {}

  // ─── CURSOS ───────────────────────────────────────────────

  @Get('cursos')
  @ApiOperation({ summary: 'Listar todos los cursos (activos e inactivos)' })
  getCursos(@CurrentUser() user: JwtPayload) {
    return this.service.getCursos(user);
  }

  @Post('cursos')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Crear un nuevo curso' })
  createCurso(
    @Body() body: { nombre: string; anio_academico: number; nivel?: string; turno?: string; materia_ids?: string[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createCurso(body, user);
  }

  @Patch('cursos/:id')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Editar nombre / año de un curso' })
  @ApiParam({ name: 'id' })
  updateCurso(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { nombre?: string; anio_academico?: number; nivel?: string | null; turno?: string | null; materia_ids?: string[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateCurso(id, body, user);
  }

  @Delete('cursos/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Activar / desactivar un curso (toggle)' })
  @ApiParam({ name: 'id' })
  toggleCurso(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.toggleCurso(id, user);
  }

  // ─── MATERIAS ─────────────────────────────────────────────

  @Get('materias')
  @ApiOperation({ summary: 'Listar todas las materias' })
  getMaterias(@CurrentUser() user: JwtPayload) {
    return this.service.getMaterias(user);
  }

  @Post('materias')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Crear una nueva materia' })
  createMateria(
    @Body() body: { nombre: string; codigo?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createMateria(body, user);
  }

  @Patch('materias/:id')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Editar nombre / código de una materia' })
  @ApiParam({ name: 'id' })
  updateMateria(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { nombre?: string; codigo?: string | null },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateMateria(id, body, user);
  }

  @Delete('materias/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Activar / desactivar una materia (toggle)' })
  @ApiParam({ name: 'id' })
  toggleMateria(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.toggleMateria(id, user);
  }

  // ─── PERIODOS ─────────────────────────────────────────────

  @Get('periodos')
  @ApiOperation({ summary: 'Listar todos los períodos' })
  getPeriodos(@CurrentUser() user: JwtPayload) {
    return this.service.getPeriodos(user);
  }

  @Post('periodos')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Crear un nuevo período' })
  createPeriodo(
    @Body('nombre') nombre: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createPeriodo(nombre, user);
  }

  @Patch('periodos/:id')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Renombrar un período' })
  @ApiParam({ name: 'id' })
  updatePeriodo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('nombre') nombre: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updatePeriodo(id, nombre, user);
  }

  @Delete('periodos/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Activar / desactivar un período (toggle)' })
  @ApiParam({ name: 'id' })
  togglePeriodo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.togglePeriodo(id, user);
  }

  // ─── CICLOS LECTIVOS ──────────────────────────────────────

  @Get('ciclos')
  @ApiOperation({ summary: 'Listar todos los ciclos lectivos' })
  getCiclos(@CurrentUser() user: JwtPayload) {
    return this.service.getCiclos(user);
  }

  @Post('ciclos')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Crear un nuevo ciclo lectivo' })
  createCiclo(
    @Body('anio') anio: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createCiclo(Number(anio), user);
  }

  @Patch('ciclos/:id')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Editar un ciclo lectivo' })
  @ApiParam({ name: 'id' })
  updateCiclo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { anio?: number; nombre?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateCiclo(id, body, user);
  }

  @Delete('ciclos/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Activar / desactivar un ciclo lectivo (toggle)' })
  @ApiParam({ name: 'id' })
  toggleCiclo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.toggleCiclo(id, user);
  }
}
