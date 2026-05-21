import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CalificacionesService } from './calificaciones.service';
import { CreateCalificacionDto } from './dto/create-calificacion.dto';
import { BulkCalificacionesDto } from './dto/bulk-calificaciones.dto';
import { CerrarActaDto } from './dto/cerrar-acta.dto';
import { QueryCalificacionesDto } from './dto/query-calificaciones.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Calificaciones')
@ApiBearerAuth()
@Controller('calificaciones')
export class CalificacionesController {
  constructor(private readonly calificacionesService: CalificacionesService) {}

  // ─── Catálogos ────────────────────────────────────────────

  @Get('cursos')
  @ApiOperation({ summary: 'Listar cursos activos de la institución' })
  getCursos(@CurrentUser() user: JwtPayload) {
    return this.calificacionesService.getCursos(user);
  }

  @Get('materias')
  @ApiOperation({ summary: 'Listar materias activas de la institución' })
  getMaterias(@CurrentUser() user: JwtPayload) {
    return this.calificacionesService.getMaterias(user);
  }

  @Get('cursos/:cursoId/alumnos')
  @ApiOperation({ summary: 'Listar alumnos activos inscriptos en un curso' })
  @ApiParam({ name: 'cursoId', description: 'UUID del curso' })
  getAlumnosByCurso(
    @Param('cursoId', ParseUUIDPipe) cursoId: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.calificacionesService.getAlumnosByCurso(cursoId);
  }

  // ─── Carga individual ─────────────────────────────────────

  @Post()
  @Roles('admin', 'directivo', 'administrativo', 'docente')
  @ApiOperation({ summary: 'Cargar o actualizar una calificación individual' })
  @ApiResponse({ status: 201, description: 'Calificación guardada (upsert)' })
  @ApiResponse({ status: 409, description: 'El acta está cerrada' })
  cargar(
    @Body() dto: CreateCalificacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calificacionesService.cargarCalificacion(dto, user);
  }

  // ─── Carga bulk ───────────────────────────────────────────

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo', 'docente')
  @ApiOperation({ summary: 'Cargar o actualizar múltiples calificaciones en una sola operación' })
  @ApiResponse({ status: 200, description: 'Calificaciones guardadas' })
  @ApiResponse({ status: 409, description: 'El acta está cerrada' })
  cargarBulk(
    @Body() dto: BulkCalificacionesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calificacionesService.cargarBulk(dto, user);
  }

  // ─── Consultar acta ───────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Obtener acta con calificaciones y promedio general' })
  @ApiResponse({ status: 200, description: 'Acta encontrada con calificaciones' })
  @ApiResponse({ status: 404, description: 'Acta no encontrada' })
  getActa(
    @Query() query: QueryCalificacionesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calificacionesService.getActa(query, user);
  }

  // ─── Cerrar acta ──────────────────────────────────────────

  @Patch(':id/cerrar')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo', 'docente')
  @ApiOperation({ summary: 'Cerrar un acta (pasa a estado definitivo)' })
  @ApiParam({ name: 'id', description: 'UUID del acta' })
  @ApiResponse({ status: 200, description: 'Acta cerrada' })
  @ApiResponse({ status: 404, description: 'Acta no encontrada' })
  @ApiResponse({ status: 409, description: 'El acta ya está cerrada' })
  cerrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CerrarActaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calificacionesService.cerrarActa(id, dto, user);
  }

  // ─── Rectificar acta ──────────────────────────────────────

  @Patch(':id/rectificar')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Reabrir un acta cerrada para corrección (solo directivo/admin)' })
  @ApiParam({ name: 'id', description: 'UUID del acta' })
  @ApiResponse({ status: 200, description: 'Acta reabierta a estado borrador' })
  @ApiResponse({ status: 403, description: 'Sin permiso para rectificar actas' })
  @ApiResponse({ status: 404, description: 'Acta no encontrada' })
  rectificar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calificacionesService.rectificarActa(id, user);
  }
}
