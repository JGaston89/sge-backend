import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AlumnosService } from './alumnos.service';
import { CalificacionesService } from '../calificaciones/calificaciones.service';
import { DocumentosService } from '../documentos/documentos.service';
import { InscripcionesService } from '../inscripciones/inscripciones.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { UpdateAlumnoDto } from './dto/update-alumno.dto';
import { BajaAlumnoDto } from './dto/baja-alumno.dto';
import { QueryAlumnosDto } from './dto/query-alumnos.dto';
import { UploadDocumentoDto } from '../documentos/dto/upload-documento.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Alumnos')
@ApiBearerAuth()
@Controller('alumnos')
export class AlumnosController {
  constructor(
    private readonly alumnosService: AlumnosService,
    private readonly calificacionesService: CalificacionesService,
    private readonly documentosService: DocumentosService,
    private readonly inscripcionesService: InscripcionesService,
    private readonly pdfService: PdfService,
  ) {}

  // ─── ALTA ─────────────────────────────────────────────────

  @Post()
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Dar de alta un alumno con legajo automático' })
  @ApiResponse({ status: 201, description: 'Alumno creado con número de legajo asignado' })
  @ApiResponse({ status: 409, description: 'DNI ya registrado en la institución' })
  create(
    @Body() dto: CreateAlumnoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alumnosService.create(dto, user);
  }

  // ─── LISTADO ──────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar alumnos con paginación cursor-based y filtros' })
  @ApiResponse({ status: 200, description: 'Página de alumnos con cursor para la siguiente' })
  findAll(
    @Query() query: QueryAlumnosDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alumnosService.findAll(query, user);
  }

  // ─── RIESGO ACADÉMICO ─────────────────────────────────────

  @Get('riesgo')
  @ApiOperation({ summary: 'Alumnos en riesgo académico del ciclo: promedio < 6 o estado libre' })
  @ApiQuery({ name: 'ciclo', required: false, description: 'Año académico (default: año actual)' })
  @ApiResponse({ status: 200, description: 'Lista de alumnos en riesgo con métricas' })
  getEnRiesgo(
    @Query('ciclo') ciclo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const anio = ciclo ? parseInt(ciclo, 10) : new Date().getFullYear();
    return this.alumnosService.getEnRiesgo(anio, user);
  }

  // ─── LEGAJO COMPLETO ──────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Legajo completo de un alumno' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiResponse({ status: 200, description: 'Datos completos del alumno' })
  @ApiResponse({ status: 404, description: 'Alumno no encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alumnosService.findOne(id, user);
  }

  // ─── ACTUALIZACIÓN PARCIAL ────────────────────────────────

  @Patch(':id')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Actualización parcial del legajo' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiResponse({ status: 200, description: 'Legajo actualizado' })
  @ApiResponse({ status: 404, description: 'Alumno no encontrado' })
  @ApiResponse({ status: 409, description: 'El alumno está dado de baja' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlumnoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alumnosService.update(id, dto, user);
  }

  // ─── BAJA ─────────────────────────────────────────────────

  @Post(':id/baja')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Dar de baja a un alumno con motivo y fecha' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiResponse({ status: 200, description: 'Alumno dado de baja' })
  @ApiResponse({ status: 409, description: 'El alumno ya está dado de baja' })
  darDeBaja(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BajaAlumnoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alumnosService.darDeBaja(id, dto, user);
  }

  // ─── CALIFICACIONES ──────────────────────────────────────

  @Get(':id/calificaciones')
  @ApiOperation({ summary: 'Historial de calificaciones del alumno' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiResponse({ status: 200, description: 'Lista de calificaciones por materia y período' })
  @ApiResponse({ status: 404, description: 'Alumno no encontrado' })
  async getCalificaciones(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.alumnosService.findOne(id, user);
    return this.calificacionesService.getCalificacionesAlumno(id, user);
  }

  // ─── BOLETÍN PDF ──────────────────────────────────────────

  @Get(':id/boletin')
  @ApiOperation({ summary: 'Genera y descarga el boletín PDF del alumno para un período' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiQuery({ name: 'periodo', required: true, example: '1er trimestre' })
  @ApiQuery({ name: 'ciclo', required: false, example: 2026, description: 'Año académico (default: año actual)' })
  async descargarBoletin(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('periodo') periodo: string,
    @Query('ciclo') ciclo: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const anio = ciclo ? parseInt(ciclo, 10) : new Date().getFullYear();
    const appUrl = `${(res.req as { protocol: string }).protocol}://${(res.req as { get: (h: string) => string }).get('host')}`;
    const { buffer, hash } = await this.calificacionesService.getBoletinPdf(id, periodo, anio, user, appUrl);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="boletin-${id}-${periodo.replace(/\s+/g, '-')}.pdf"`,
      'X-Document-Hash': hash,
    });
    res.end(buffer);
  }

  // ─── FICHA PDF ────────────────────────────────────────────

  @Get(':id/ficha/pdf')
  @ApiOperation({ summary: 'Descarga la ficha completa del alumno en formato PDF' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiResponse({ status: 200, description: 'PDF del legajo del alumno' })
  async descargarFicha(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const alumno = await this.alumnosService.findOne(id, user);
    const inscripciones = await this.inscripcionesService.findByAlumno(id, user) as Array<{
      ciclo_lectivo: number;
      curso_nombre: string;
      estado: string;
      fecha_inscripcion: string;
      observaciones: string | null;
    }>;

    const appUrl = `${(res.req as { protocol: string }).protocol}://${(res.req as { get: (h: string) => string }).get('host')}`;

    const { buffer, hash } = await this.pdfService.generateFichaPdf({
      alumno: {
        legajo:           alumno.numero_legajo,
        nombre:           alumno.nombre,
        apellido:         alumno.apellido,
        dni:              alumno.dni,
        fecha_nacimiento: alumno.fecha_nacimiento,
        genero:           alumno.genero,
        nacionalidad:     alumno.nacionalidad,
        email:            alumno.email,
        telefono:         alumno.telefono,
        domicilio:        alumno.domicilio,
        estado:           alumno.estado,
        fecha_baja:       alumno.fecha_baja,
        contactos:        alumno.contactos ?? [],
      },
      institucion: { nombre: 'Sistema de Gestión Educativa' },
      inscripciones: inscripciones.map((i) => ({
        ciclo_lectivo:    i.ciclo_lectivo,
        curso_nombre:     i.curso_nombre,
        estado:           i.estado,
        fecha_inscripcion: i.fecha_inscripcion,
        observaciones:    i.observaciones,
      })),
    }, appUrl);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ficha-${alumno.numero_legajo}.pdf"`,
      'X-Document-Hash': hash,
    });
    res.end(buffer);
  }

  // ─── HISTORIAL ────────────────────────────────────────────

  @Get(':id/historial')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Historial completo de cambios del alumno' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiResponse({ status: 200, description: 'Lista de eventos de auditoría' })
  historial(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alumnosService.getHistorial(id, user);
  }

  // ─── INSCRIPCIONES ────────────────────────────────────────

  @Get(':id/inscripciones')
  @ApiOperation({ summary: 'Historial de inscripciones del alumno' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiResponse({ status: 200, description: 'Lista de inscripciones por ciclo' })
  getInscripciones(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inscripcionesService.findByAlumno(id, user);
  }

  // ─── DOCUMENTOS ───────────────────────────────────────────

  @Post(':id/documentos')
  @Roles('admin', 'directivo', 'administrativo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Subir documento al legajo del alumno (S3)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tipo_documento: { type: 'string', enum: ['dni','partida_nacimiento','libreta_sanitaria','certificado_medico','foto','constancia_domicilio','vacunas','beca','otro'] },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiResponse({ status: 201, description: 'Documento subido correctamente' })
  subirDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadDocumentoDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentosService.upload(id, file, dto.tipo_documento, user);
  }

  @Get(':id/documentos')
  @ApiOperation({ summary: 'Listar documentos del legajo con URLs pre-firmadas (15 min)' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiResponse({ status: 200, description: 'Lista de documentos con URL de descarga temporal' })
  listarDocumentos(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentosService.findByAlumno(id, user);
  }

  @Delete(':id/documentos/:docId')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Eliminar documento del legajo (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiParam({ name: 'docId', description: 'UUID del documento' })
  @ApiResponse({ status: 200, description: 'Documento eliminado' })
  eliminarDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentosService.delete(id, docId, user);
  }
}
