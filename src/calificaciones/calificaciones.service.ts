import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CalificacionesRepository } from './calificaciones.repository';
import { CreateCalificacionDto } from './dto/create-calificacion.dto';
import { BulkCalificacionesDto } from './dto/bulk-calificaciones.dto';
import { CerrarActaDto } from './dto/cerrar-acta.dto';
import { QueryCalificacionesDto } from './dto/query-calificaciones.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PdfService, BoletinPdfData } from '../pdf/pdf.service';

// ─── Helpers ─────────────────────────────────────────────────

const CONCEPTUAL_MAP: Record<string, number> = {
  MB: 9,   // Muy Bueno
  B:  7,   // Bueno
  R:  5,   // Regular
  I:  3,   // Insuficiente
  NP: 1,   // No Presentado
  A:  10,  // Aprobado
  E:  10,  // Excelente
  S:  7,   // Satisfactorio
  NS: 4,   // No Satisfactorio
};

function parseNotaNumerica(valor: string): number | null {
  const n = parseFloat(valor);
  if (!isNaN(n)) return n;
  const upper = valor.trim().toUpperCase();
  return CONCEPTUAL_MAP[upper] ?? null;
}

function anioActual(): number {
  return new Date().getFullYear();
}

// ─── Service ─────────────────────────────────────────────────

@Injectable()
export class CalificacionesService {
  constructor(
    private readonly repo: CalificacionesRepository,
    private readonly pdfService: PdfService,
  ) {}

  // ─── Obtener o crear acta implícitamente ──────────────────

  private async obtenerOCrearActa(
    curso_id: string,
    materia_id: string,
    periodo: string,
    anio_academico: number,
    institucion_id: string,
    creado_por: string,
  ) {
    let acta = await this.repo.findActa(
      curso_id,
      materia_id,
      periodo,
      anio_academico,
      institucion_id,
    );

    if (!acta) {
      acta = await this.repo.createActa({
        institucion_id,
        curso_id,
        materia_id,
        periodo,
        anio_academico,
        creado_por,
      });
    }

    return acta;
  }

  // ─── Carga individual ─────────────────────────────────────

  async cargarCalificacion(dto: CreateCalificacionDto, user: JwtPayload) {
    const anio = dto.anio_academico ?? anioActual();

    const acta = await this.obtenerOCrearActa(
      dto.curso_id,
      dto.materia_id,
      dto.periodo,
      anio,
      user.inst,
      user.sub,
    );

    if (acta.estado === 'cerrada') {
      throw new ConflictException('El acta está cerrada y no admite modificaciones');
    }

    const nota_numerica = parseNotaNumerica(dto.nota_valor);
    const tipo = dto.tipo ?? 'nota';

    const calificacion = await this.repo.upsertCalificacion({
      acta_id: acta.id,
      alumno_id: dto.alumno_id,
      tipo,
      nota_valor: dto.nota_valor,
      nota_numerica,
      observaciones: dto.observaciones ?? null,
      cargado_por: user.sub,
    });

    await this.repo.auditLog({
      usuario_id: user.sub,
      accion: 'UPSERT_CALIFICACION',
      registro_id: acta.id,
      payload_after: { calificacion_id: calificacion.id, alumno_id: dto.alumno_id, tipo, nota_valor: dto.nota_valor },
    });

    return calificacion;
  }

  // ─── Carga bulk ───────────────────────────────────────────

  async cargarBulk(dto: BulkCalificacionesDto, user: JwtPayload) {
    const anio = dto.anio_academico ?? anioActual();

    const acta = await this.obtenerOCrearActa(
      dto.curso_id,
      dto.materia_id,
      dto.periodo,
      anio,
      user.inst,
      user.sub,
    );

    if (acta.estado === 'cerrada') {
      throw new ConflictException('El acta está cerrada y no admite modificaciones');
    }

    const items = dto.calificaciones.map((c) => ({
      alumno_id: c.alumno_id,
      tipo: c.tipo ?? 'nota',
      nota_valor: c.nota_valor,
      nota_numerica: parseNotaNumerica(c.nota_valor),
      observaciones: c.observaciones ?? null,
    }));

    const calificaciones = await this.repo.bulkUpsertCalificaciones(
      acta.id,
      items,
      user.sub,
    );

    await this.repo.auditLog({
      usuario_id: user.sub,
      accion: 'BULK_CALIFICACIONES',
      registro_id: acta.id,
      payload_after: { total: calificaciones.length },
    });

    return { acta_id: acta.id, total: calificaciones.length, calificaciones };
  }

  // ─── Consultar acta ───────────────────────────────────────

  async getActa(query: QueryCalificacionesDto, user: JwtPayload) {
    const anio = query.anio_academico ?? anioActual();
    const acta = await this.repo.findActa(
      query.curso_id,
      query.materia_id,
      query.periodo,
      anio,
      user.inst,
    );

    if (!acta) {
      throw new NotFoundException('Acta no encontrada para los parámetros indicados');
    }

    return this.repo.getActaConCalificaciones(acta.id, user.inst);
  }

  // ─── Cerrar acta ──────────────────────────────────────────

  async cerrarActa(acta_id: string, dto: CerrarActaDto, user: JwtPayload) {
    const acta = await this.repo.findActaById(acta_id, user.inst);
    if (!acta) throw new NotFoundException('Acta no encontrada');
    if (acta.estado === 'cerrada') {
      throw new ConflictException('El acta ya está cerrada');
    }

    const actaCerrada = await this.repo.cerrarActa(acta_id, user.sub);

    await this.repo.auditLog({
      usuario_id: user.sub,
      accion: 'CERRAR_ACTA',
      registro_id: acta_id,
      payload_before: { estado: 'borrador' },
      payload_after: { estado: 'cerrada', observaciones: dto.observaciones },
    });

    return actaCerrada;
  }

  // ─── Rectificar acta (solo directivo/admin) ───────────────

  async rectificarActa(acta_id: string, user: JwtPayload) {
    const rolesPermitidos = ['admin', 'directivo'];
    const tienePermiso = user.roles.some((r) => rolesPermitidos.includes(r));
    if (!tienePermiso) {
      throw new ForbiddenException('Solo directivos o administradores pueden rectificar actas');
    }

    const acta = await this.repo.findActaById(acta_id, user.inst);
    if (!acta) throw new NotFoundException('Acta no encontrada');
    if (acta.estado === 'borrador') {
      throw new ConflictException('El acta ya está en estado borrador');
    }

    const actaRectificada = await this.repo.rectificarActa(acta_id);

    await this.repo.auditLog({
      usuario_id: user.sub,
      accion: 'RECTIFICAR_ACTA',
      registro_id: acta_id,
      payload_before: { estado: 'cerrada' },
      payload_after: { estado: 'borrador' },
    });

    return actaRectificada;
  }

  // ─── Catálogos ────────────────────────────────────────────

  async getCursos(user: JwtPayload) {
    return this.repo.getCursos(user.inst);
  }

  async getMaterias(user: JwtPayload) {
    return this.repo.getMaterias(user.inst);
  }

  async getAlumnosByCurso(cursoId: string) {
    return this.repo.getAlumnosByCurso(cursoId);
  }

  // ─── Calificaciones de un alumno ─────────────────────────

  async getCalificacionesAlumno(alumno_id: string, user: JwtPayload) {
    return this.repo.getCalificacionesAlumno(alumno_id, user.inst);
  }

  // ─── PDF del acta ─────────────────────────────────────────

  async getActaPdf(
    actaId: string,
    user: JwtPayload,
    appUrl: string,
  ): Promise<{ buffer: Buffer; hash: string }> {
    const acta = await this.repo.getActaConCalificaciones(actaId, user.inst);
    if (!acta) throw new NotFoundException('Acta no encontrada');

    const config = await this.repo.getInstitucionConfig(user.inst);
    const institucionNombre = (config['nombre'] as string) ?? 'Institución';

    const verifyUrl = `${appUrl}/api/v1/actas/${actaId}/verify`;

    const buffer = await this.pdfService.generateActaPdf(
      {
        acta: {
          id: acta.id,
          periodo: acta.periodo,
          anio_academico: acta.anio_academico,
          estado: acta.estado,
          cerrada_at: acta.cerrada_at,
          promedio_general: acta.promedio_general,
        },
        curso:     { nombre: acta.curso_nombre },
        materia:   { nombre: acta.materia_nombre },
        institucion: { nombre: institucionNombre },
        creado_por_nombre: acta.creado_por_nombre,
        calificaciones: acta.calificaciones,
      },
      verifyUrl,
    );

    const hash = this.pdfService.computeHash(buffer, new Date());
    await this.repo.updatePdfMeta(actaId, hash, null);

    return { buffer, hash };
  }

  // ─── Verificación pública del acta ───────────────────────

  async verifyActa(actaId: string) {
    const meta = await this.repo.getPdfMeta(actaId);
    if (!meta) return null;
    return {
      acta_id: actaId,
      hash: meta.pdf_hash,
      generado_at: meta.pdf_generado_at,
      valido: !!meta.pdf_hash,
    };
  }

  // ─── PDF boletín del alumno ───────────────────────────────

  async getBoletinPdf(
    alumnoId: string,
    periodo: string,
    anioAcademico: number,
    user: JwtPayload,
    appUrl: string,
  ): Promise<{ buffer: Buffer; hash: string }> {
    const rows = await this.repo.getBoletinData(alumnoId, periodo, anioAcademico, user.inst);

    if (!rows.length) {
      throw new NotFoundException('No se encontraron calificaciones para los parámetros indicados');
    }

    const config = await this.repo.getInstitucionConfig(user.inst);
    const institucionNombre = (config['nombre'] as string) ?? 'Institución';

    // Agrupar por materia
    const materiaMap = new Map<string, BoletinPdfData['materias'][number]>();
    for (const row of rows) {
      if (!materiaMap.has(row.materia_nombre)) {
        materiaMap.set(row.materia_nombre, { nombre: row.materia_nombre, calificaciones: [], promedio: null });
      }
      materiaMap.get(row.materia_nombre)!.calificaciones.push({
        tipo: row.tipo,
        nota_valor: row.nota_valor,
        nota_numerica: row.nota_numerica,
      });
    }

    // Promedios por materia y general
    let sumTotal = 0, countTotal = 0;
    materiaMap.forEach((m) => {
      const nums = m.calificaciones
        .map((c) => parseFloat(String(c.nota_numerica ?? '')))
        .filter((n) => !isNaN(n));
      if (nums.length) {
        m.promedio = nums.reduce((a, b) => a + b, 0) / nums.length;
        sumTotal += m.promedio;
        countTotal++;
      }
    });

    const first = rows[0];
    const verifyUrl = `${appUrl}/api/v1/actas/boletin/${alumnoId}/verify`;

    return this.pdfService.generateBoletinPdf(
      {
        alumno: {
          nombre: first.alumno_nombre,
          apellido: first.alumno_apellido,
          numero_legajo: first.alumno_legajo,
          dni: first.alumno_dni,
        },
        institucion: { nombre: institucionNombre },
        periodo,
        anio_academico: anioAcademico,
        materias: Array.from(materiaMap.values()),
        promedio_general: countTotal > 0 ? sumTotal / countTotal : null,
      },
      verifyUrl,
    );
  }
}
