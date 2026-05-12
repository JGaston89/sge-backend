import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Res, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { ExamenesService } from './examenes.service';
import { CreateMesaDto, InscribirAlumnoDto, CargarNotasDto } from './dto/examenes.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Examenes')
@ApiBearerAuth()
@Controller('examenes')
export class ExamenesController {
  constructor(private readonly service: ExamenesService) {}

  // ── Mesas ────────────────────────────────────────────────────

  @Post('mesas')
  @ApiOperation({ summary: 'Crear mesa de examen' })
  createMesa(
    @Body() dto: CreateMesaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createMesa(dto, user);
  }

  @Get('mesas')
  @ApiOperation({ summary: 'Listar mesas disponibles con filtros opcionales' })
  @ApiQuery({ name: 'ciclo_id',   required: false })
  @ApiQuery({ name: 'materia_id', required: false })
  @ApiQuery({ name: 'estado',     required: false, enum: ['abierta', 'cerrada', 'cancelada'] })
  @ApiQuery({ name: 'curso_id',   required: false })
  getMesas(
    @Query('ciclo_id')   ciclo_id: string,
    @Query('materia_id') materia_id: string,
    @Query('estado')     estado: string,
    @Query('curso_id')   curso_id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getMesas(user, {
      ciclo_id:   ciclo_id   || undefined,
      materia_id: materia_id || undefined,
      estado:     estado     || undefined,
      curso_id:   curso_id   || undefined,
    });
  }

  @Get('mesas/:id')
  @ApiOperation({ summary: 'Detalle de mesa con lista de inscriptos' })
  @ApiParam({ name: 'id' })
  getMesaById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getMesaById(id, user);
  }

  // ── Inscripción / Desinscripción ─────────────────────────────

  @Post('mesas/:id/inscribir')
  @ApiOperation({ summary: 'Inscribir alumno a una mesa de examen' })
  @ApiParam({ name: 'id' })
  inscribir(
    @Param('id', ParseUUIDPipe) mesaId: string,
    @Body() dto: InscribirAlumnoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.inscribir(mesaId, dto.alumno_id, user);
  }

  @Delete('inscripciones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desinscribir alumno de una mesa (bloqueado si quedan < 48hs)' })
  @ApiParam({ name: 'id' })
  desinscribir(
    @Param('id', ParseUUIDPipe) inscripcionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.desinscribir(inscripcionId, user);
  }

  // ── Notas ────────────────────────────────────────────────────

  @Put('mesas/:id/notas')
  @ApiOperation({ summary: 'Docente carga notas del examen para todos los inscriptos' })
  @ApiParam({ name: 'id' })
  cargarNotas(
    @Param('id', ParseUUIDPipe) mesaId: string,
    @Body() dto: CargarNotasDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cargarNotas(mesaId, dto, user);
  }

  // ── Acta ─────────────────────────────────────────────────────

  @Post('mesas/:id/acta/cerrar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar el acta de una mesa (estado → cerrada)' })
  @ApiParam({ name: 'id' })
  cerrarMesa(
    @Param('id', ParseUUIDPipe) mesaId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cerrarMesa(mesaId, user);
  }

  @Get('mesas/:id/acta')
  @ApiOperation({ summary: 'Descargar el acta PDF de una mesa' })
  @ApiParam({ name: 'id' })
  async downloadActa(
    @Param('id', ParseUUIDPipe) mesaId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generarActaPdf(mesaId, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="acta-${mesaId}.pdf"`);
    res.send(buffer);
  }
}
