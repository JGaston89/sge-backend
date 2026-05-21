import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { InscripcionesService } from './inscripciones.service';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { InscripcionMasivaDto } from './dto/inscripcion-masiva.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { AsignarMasivoDto } from './dto/asignar-masivo.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Inscripciones')
@ApiBearerAuth()
@Controller('inscripciones')
export class InscripcionesController {
  constructor(private readonly service: InscripcionesService) {}

  // ── POST /inscripciones ──────────────────────────────────────

  @Post()
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Inscribir un alumno a un curso en un ciclo lectivo' })
  @ApiResponse({ status: 201, description: 'Inscripción creada' })
  @ApiResponse({ status: 409, description: 'Alumno ya inscripto en ese curso/ciclo' })
  create(
    @Body() dto: CreateInscripcionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  // ── GET /inscripciones/export?curso_id=&ciclo_lectivo= ──────

  @Get('export')
  @ApiOperation({ summary: 'Exportar nómina de inscripciones como PDF' })
  @ApiQuery({ name: 'curso_id',      required: true })
  @ApiQuery({ name: 'ciclo_lectivo', required: true })
  async exportPdf(
    @Query('curso_id') cursoId: string,
    @Query('ciclo_lectivo') cicloLectivo: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportPdf(cursoId, Number(cicloLectivo), user);
    const filename = `inscripciones-${cursoId}-${cicloLectivo}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(buffer);
  }

  // ── GET /inscripciones?curso_id=&ciclo_lectivo= ──────────────

  @Get()
  @ApiOperation({ summary: 'Listar inscripciones por curso y ciclo lectivo' })
  @ApiQuery({ name: 'curso_id', required: true })
  @ApiQuery({ name: 'ciclo_lectivo', required: true })
  @ApiResponse({ status: 200, description: 'Lista de inscripciones' })
  findByCursoCiclo(
    @Query('curso_id') cursoId: string,
    @Query('ciclo_lectivo') cicloLectivo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findByCursoCiclo(cursoId, Number(cicloLectivo), user);
  }

  // ── GET /inscripciones/alumnos-disponibles?ciclo_lectivo= ────

  @Get('alumnos-disponibles')
  @ApiOperation({ summary: 'Alumnos activos sin inscripción en el ciclo dado' })
  @ApiQuery({ name: 'ciclo_lectivo', required: true, type: Number })
  getAlumnosDisponibles(
    @Query('ciclo_lectivo') cicloLectivo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getAlumnosDisponibles(Number(cicloLectivo), user);
  }

  // ── POST /inscripciones/asignar-masivo ───────────────────────

  @Post('asignar-masivo')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Inscribir masivamente alumnos sin curso en un ciclo' })
  asignarMasivo(
    @Body() dto: AsignarMasivoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.asignarMasivo(dto, user);
  }

  // ── POST /inscripciones/masiva/preview ───────────────────────

  @Post('masiva/preview')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Previsualizar reinscripción masiva antes de confirmar' })
  @ApiResponse({ status: 200, description: 'Preview con alumnos a inscribir y duplicados' })
  preview(
    @Body() dto: InscripcionMasivaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.previsualizarMasiva(dto, user);
  }

  // ── POST /inscripciones/masiva ───────────────────────────────

  @Post('masiva')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Ejecutar reinscripción masiva de alumnos regulares' })
  @ApiResponse({ status: 201, description: 'Resumen de inscripciones creadas' })
  masiva(
    @Body() dto: InscripcionMasivaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.ejecutarMasiva(dto, user);
  }

  // ── PATCH /inscripciones/:id/estado ─────────────────────────

  @Patch(':id/estado')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Cambiar estado de una inscripción (regular/libre/baja)' })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cambiarEstado(id, dto.estado, user);
  }
}
