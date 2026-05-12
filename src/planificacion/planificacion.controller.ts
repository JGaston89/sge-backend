import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Res, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { PlanificacionService } from './planificacion.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import type { CreatePlanificacionDto, UpdatePlanificacionDto } from './dto/planificacion.dto';
import { CreateClaseDictadaDto } from './dto/clase-dictada.dto';

@ApiTags('Planificacion')
@ApiBearerAuth()
@Controller('planificacion')
export class PlanificacionController {
  constructor(private readonly service: PlanificacionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar planificaciones con filtros opcionales' })
  @ApiQuery({ name: 'ciclo_lectivo', required: false })
  @ApiQuery({ name: 'curso_id',      required: false })
  @ApiQuery({ name: 'materia_id',    required: false })
  @ApiQuery({ name: 'estado',        required: false })
  findAll(
    @Query('ciclo_lectivo') ciclo_lectivo: string,
    @Query('curso_id')      curso_id: string,
    @Query('materia_id')    materia_id: string,
    @Query('estado')        estado: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(user, {
      ciclo_lectivo: ciclo_lectivo ? parseInt(ciclo_lectivo, 10) : undefined,
      curso_id:      curso_id      || undefined,
      materia_id:    materia_id    || undefined,
      estado:        estado        || undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una planificación por ID' })
  @ApiParam({ name: 'id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una planificación curricular' })
  create(
    @Body() dto: CreatePlanificacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una planificación' })
  @ApiParam({ name: 'id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanificacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una planificación' })
  @ApiParam({ name: 'id' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }

  // ─── Nuevos endpoints Sprint 12 ──────────────────────────────

  @Patch(':id/aprobar')
  @ApiOperation({ summary: 'Aprobar una planificación (estado enviada → aprobada)' })
  @ApiParam({ name: 'id' })
  aprobar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.aprobar(id, user);
  }

  @Get('avance')
  @ApiOperation({ summary: 'Porcentaje de avance del programa por planificación' })
  @ApiQuery({ name: 'materia_id',    required: false })
  @ApiQuery({ name: 'ciclo_lectivo', required: false })
  getAvance(
    @Query('materia_id')    materia_id: string,
    @Query('ciclo_lectivo') ciclo_lectivo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getAvance(user, {
      materia_id:    materia_id    || undefined,
      ciclo_lectivo: ciclo_lectivo ? parseInt(ciclo_lectivo, 10) : undefined,
    });
  }

  @Post('clases')
  @ApiOperation({ summary: 'Registrar clase dictada (diario de clases)' })
  createClase(
    @Body() dto: CreateClaseDictadaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createClaseDictada(dto, user);
  }

  @Get(':id/clases')
  @ApiOperation({ summary: 'Listar clases dictadas de una planificación' })
  @ApiParam({ name: 'id' })
  getClases(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getClasesDictadas(id, user);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Exportar planificación completa a PDF' })
  @ApiParam({ name: 'id' })
  async exportPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportarPdf(id, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="planificacion-${id}.pdf"`);
    res.send(buffer);
  }
}
