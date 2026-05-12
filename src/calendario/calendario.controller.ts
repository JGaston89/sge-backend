import {
  Controller, Get, Post, Body, Query, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { CalendarioService } from './calendario.service';
import { CreateCicloDto, CreateEventoDto, ImportarFeriadosDto } from './dto/calendario.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Calendario')
@ApiBearerAuth()
@Controller('calendario')
export class CalendarioController {
  constructor(private readonly service: CalendarioService) {}

  // ── Ciclos lectivos ──────────────────────────────────────────

  @Post('ciclos')
  @ApiOperation({ summary: 'Crear ciclo lectivo' })
  createCiclo(
    @Body() dto: CreateCicloDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createCiclo(dto, user);
  }

  @Get('ciclos')
  @ApiOperation({ summary: 'Listar ciclos lectivos de la institución' })
  getCiclos(@CurrentUser() user: JwtPayload) {
    return this.service.getCiclos(user);
  }

  @Get('ciclos/activo')
  @ApiOperation({ summary: 'Obtener ciclo lectivo en curso (fecha_inicio ≤ hoy ≤ fecha_fin)' })
  getCicloActivo(@CurrentUser() user: JwtPayload) {
    return this.service.getCicloActivo(user);
  }

  // ── Eventos ──────────────────────────────────────────────────

  @Post('eventos')
  @ApiOperation({ summary: 'Crear evento en el calendario académico' })
  createEvento(
    @Body() dto: CreateEventoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createEvento(dto, user);
  }

  @Get('eventos')
  @ApiOperation({ summary: 'Listar eventos en rango de fechas, opcionalmente filtrando por tipo' })
  @ApiQuery({ name: 'desde', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'tipo',  required: false })
  getEventos(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('tipo')  tipo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getEventos(user, {
      desde: desde || undefined,
      hasta: hasta || undefined,
      tipo:  tipo  || undefined,
    });
  }

  // ── iCal export ──────────────────────────────────────────────

  @Get('eventos/export.ics')
  @ApiOperation({ summary: 'Exportar todos los eventos en formato iCalendar (.ics)' })
  async exportIcal(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const ical = await this.service.exportIcal(user);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="calendario.ics"');
    res.send(ical);
  }

  // ── Feriados nacionales ──────────────────────────────────────

  @Post('feriados/importar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Importar feriados argentinos desde Nager.Date API' })
  importarFeriados(
    @Body() dto: ImportarFeriadosDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.importarFeriados(dto, user);
  }
}
