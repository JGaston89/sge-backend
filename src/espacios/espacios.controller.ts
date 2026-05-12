import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { EspaciosService } from './espacios.service';
import {
  CreateEspacioDto, UpdateEspacioEstadoDto,
  CreateReservaEspacioDto, CreateMantenimientoDto, UpdateMantenimientoDto,
} from './dto/espacios.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Espacios')
@ApiBearerAuth()
@Controller('espacios')
export class EspaciosController {
  constructor(private readonly service: EspaciosService) {}

  // ── Espacios ──────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Crear espacio físico (aula, laboratorio, SUM, etc.)' })
  createEspacio(
    @Body() dto: CreateEspacioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createEspacio(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar espacios de la institución' })
  @ApiQuery({ name: 'tipo', required: false, enum: ['aula', 'laboratorio', 'sum', 'biblioteca', 'patio', 'otro'] })
  findEspacios(
    @Query('tipo') tipo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findEspacios(user, tipo || undefined);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado de un espacio (disponible/mantenimiento/inhabilitado)' })
  @ApiParam({ name: 'id' })
  updateEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEspacioEstadoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateEstado(id, dto, user);
  }

  // ── Disponibilidad ────────────────────────────────────────────

  @Get('disponibilidad')
  @ApiOperation({ summary: 'Espacios libres en una fecha y horario' })
  @ApiQuery({ name: 'fecha' })
  @ApiQuery({ name: 'hora_inicio', example: '08:00' })
  @ApiQuery({ name: 'hora_fin',    example: '10:00' })
  findDisponibles(
    @Query('fecha')       fecha: string,
    @Query('hora_inicio') hora_inicio: string,
    @Query('hora_fin')    hora_fin: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findDisponibles(user, fecha, hora_inicio, hora_fin);
  }

  @Get('ocupacion')
  @ApiOperation({ summary: 'Mapa de ocupación semanal (fecha del lunes)' })
  @ApiQuery({ name: 'semana', description: 'Lunes de la semana (YYYY-MM-DD)' })
  getOcupacion(
    @Query('semana') semana: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getOcupacion(user, semana);
  }

  // ── Reservas ─────────────────────────────────────────────────

  @Post(':id/reservas')
  @ApiOperation({ summary: 'Reservar un espacio en una fecha y horario' })
  @ApiParam({ name: 'id' })
  createReserva(
    @Param('id', ParseUUIDPipe) espacioId: string,
    @Body() dto: CreateReservaEspacioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createReserva(espacioId, dto, user);
  }

  @Get('mis-reservas')
  @ApiOperation({ summary: 'Reservas propias del usuario autenticado' })
  getMisReservas(@CurrentUser() user: JwtPayload) {
    return this.service.getMisReservas(user);
  }

  @Delete('reservas/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar una reserva confirmada' })
  @ApiParam({ name: 'id' })
  cancelarReserva(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cancelarReserva(id, user);
  }

  // ── Mantenimiento ─────────────────────────────────────────────

  @Post('mantenimiento')
  @ApiOperation({ summary: 'Registrar solicitud de mantenimiento' })
  createMantenimiento(
    @Body() dto: CreateMantenimientoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createMantenimiento(dto, user);
  }

  @Get('mantenimiento')
  @ApiOperation({ summary: 'Listar solicitudes de mantenimiento' })
  @ApiQuery({ name: 'estado', required: false, enum: ['pendiente', 'en_proceso', 'resuelto'] })
  findMantenimiento(
    @Query('estado') estado: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findMantenimiento(user, estado || undefined);
  }

  @Patch('mantenimiento/:id')
  @ApiOperation({ summary: 'Actualizar estado de solicitud de mantenimiento' })
  @ApiParam({ name: 'id' })
  updateMantenimiento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMantenimientoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateMantenimiento(id, dto, user);
  }
}
