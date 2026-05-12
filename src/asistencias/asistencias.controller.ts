import {
  Controller, Get, Post, Patch,
  Body, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AsistenciasService } from './asistencias.service';
import { RegistrarAsistenciaDto } from './dto/registrar-asistencia.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Asistencias')
@ApiBearerAuth()
@Controller('asistencias')
export class AsistenciasController {
  constructor(private readonly service: AsistenciasService) {}

  // ── POST /asistencias ────────────────────────────────────────
  // Registra (o actualiza) la asistencia de toda una clase en una fecha

  @Post()
  @ApiOperation({ summary: 'Registrar asistencia de una clase (upsert por alumno/materia/fecha)' })
  registrar(
    @Body() dto: RegistrarAsistenciaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registrar(dto, user);
  }

  // ── GET /asistencias?curso_id=&materia_id=&fecha= ────────────

  @Get()
  @ApiOperation({ summary: 'Listar asistencias de una clase en una fecha' })
  @ApiQuery({ name: 'curso_id',   required: true })
  @ApiQuery({ name: 'materia_id', required: true })
  @ApiQuery({ name: 'fecha',      required: true, description: 'YYYY-MM-DD' })
  getByClase(
    @Query('curso_id')   curso_id: string,
    @Query('materia_id') materia_id: string,
    @Query('fecha')      fecha: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getByClase(curso_id, materia_id, fecha, user);
  }

  // ── GET /asistencias/resumen?curso_id=&materia_id=&ciclo= ────

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen de asistencia por alumno en un curso/materia/ciclo' })
  @ApiQuery({ name: 'curso_id',   required: true })
  @ApiQuery({ name: 'materia_id', required: true })
  @ApiQuery({ name: 'ciclo',      required: false })
  getResumen(
    @Query('curso_id')   curso_id: string,
    @Query('materia_id') materia_id: string,
    @Query('ciclo')      ciclo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const anio = ciclo ? parseInt(ciclo, 10) : new Date().getFullYear();
    return this.service.getResumen(curso_id, materia_id, anio, user);
  }

  // ── GET /asistencias/fechas?curso_id=&materia_id=&ciclo= ─────

  @Get('fechas')
  @ApiOperation({ summary: 'Fechas de clase registradas para una materia/curso' })
  @ApiQuery({ name: 'curso_id',   required: true })
  @ApiQuery({ name: 'materia_id', required: true })
  @ApiQuery({ name: 'ciclo',      required: false })
  getFechas(
    @Query('curso_id')   curso_id: string,
    @Query('materia_id') materia_id: string,
    @Query('ciclo')      ciclo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const anio = ciclo ? parseInt(ciclo, 10) : new Date().getFullYear();
    return this.service.getFechasClase(curso_id, materia_id, anio, user);
  }

  // ── GET /asistencias/alumno/:id?ciclo=&materia_id= ───────────

  @Get('alumno/:id')
  @ApiOperation({ summary: 'Asistencia de un alumno en el ciclo (opcional: por materia)' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiQuery({ name: 'ciclo',      required: false })
  @ApiQuery({ name: 'materia_id', required: false })
  getByAlumno(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('ciclo')      ciclo: string,
    @Query('materia_id') materia_id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const anio = ciclo ? parseInt(ciclo, 10) : new Date().getFullYear();
    return this.service.getByAlumno(id, anio, user, materia_id || undefined);
  }

  // ── PATCH /asistencias/:id ───────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Corregir el estado de un registro de asistencia' })
  @ApiParam({ name: 'id' })
  updateOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { estado: string; observaciones?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateOne(id, body.estado, body.observaciones, user);
  }
}
