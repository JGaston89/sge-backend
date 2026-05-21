import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InscripcionesRepository } from './inscripciones.repository';
import { PdfService } from '../pdf/pdf.service';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { InscripcionMasivaDto } from './dto/inscripcion-masiva.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class InscripcionesService {
  constructor(
    private readonly repo: InscripcionesRepository,
    private readonly pdfService: PdfService,
  ) {}

  // ── Crear inscripción individual ─────────────────────────────

  async create(dto: CreateInscripcionDto, user: JwtPayload) {
    const yaEnCiclo = await this.repo.existsEnCiclo(dto.alumno_id, dto.ciclo_lectivo);
    if (yaEnCiclo) {
      throw new ConflictException('El alumno ya se encuentra inscripto en un curso');
    }

    return this.repo.create({
      institucion_id:    user.inst,
      alumno_id:         dto.alumno_id,
      curso_id:          dto.curso_id,
      ciclo_lectivo:     dto.ciclo_lectivo,
      estado:            dto.estado ?? 'regular',
      fecha_inscripcion: dto.fecha_inscripcion ?? new Date().toISOString().slice(0, 10),
      observaciones:     dto.observaciones,
      creado_por:        user.sub,
    });
  }

  // ── Listar inscripciones por curso + ciclo ───────────────────

  async findByCursoCiclo(cursoId: string, cicloLectivo: number, user: JwtPayload) {
    return this.repo.findByCursoCiclo(cursoId, cicloLectivo, user.inst);
  }

  // ── Historial de un alumno ────────────────────────────────────

  async findByAlumno(alumnoId: string, user: JwtPayload) {
    return this.repo.findByAlumno(alumnoId, user.inst);
  }

  // ── Alumnos disponibles para inscribir en un ciclo ───────────

  async getAlumnosDisponibles(cicloLectivo: number, user: JwtPayload) {
    return this.repo.findAlumnosDisponibles(cicloLectivo, user.inst);
  }

  // ── Asignación masiva fresca (alumnos sin curso en el ciclo) ─

  async asignarMasivo(
    dto: { curso_id: string; ciclo_lectivo: number; alumno_ids: string[]; estado?: 'regular' | 'libre'; observaciones?: string },
    user: JwtPayload,
  ) {
    const hoy = new Date().toISOString().slice(0, 10);
    const inscriptos: string[] = [];
    const errores: Array<{ alumno_id: string; mensaje: string }> = [];

    for (const alumnoId of dto.alumno_ids) {
      try {
        await this.create(
          {
            alumno_id:         alumnoId,
            curso_id:          dto.curso_id,
            ciclo_lectivo:     dto.ciclo_lectivo,
            estado:            dto.estado ?? 'regular',
            fecha_inscripcion: hoy,
            observaciones:     dto.observaciones,
          },
          user,
        );
        inscriptos.push(alumnoId);
      } catch (e: any) {
        errores.push({ alumno_id: alumnoId, mensaje: e.message ?? 'Error desconocido' });
      }
    }

    return { inscriptos: inscriptos.length, errores, total: dto.alumno_ids.length };
  }

  // ── Preview reinscripción masiva ─────────────────────────────

  async previsualizarMasiva(dto: InscripcionMasivaDto, user: JwtPayload) {
    const candidatos = await this.repo.findTodosByCursoCiclo(
      dto.curso_id_origen,
      dto.ciclo_origen,
      user.inst,
    );

    const seleccionados = dto.alumno_ids?.length
      ? candidatos.filter((c) => dto.alumno_ids!.includes(c.alumno_id))
      : candidatos;

    const resultados = await Promise.all(
      seleccionados.map(async (c) => {
        const yaExiste = await this.repo.exists(c.alumno_id, dto.curso_id_destino, dto.ciclo_destino);
        return {
          alumno_id:      c.alumno_id,
          alumno_nombre:  `${c.alumno_apellido}, ${c.alumno_nombre}`,
          alumno_legajo:  c.alumno_legajo,
          ya_inscripto:   yaExiste,
        };
      }),
    );

    return {
      total:            resultados.length,
      a_inscribir:      resultados.filter((r) => !r.ya_inscripto).length,
      ya_inscriptos:    resultados.filter((r) => r.ya_inscripto).length,
      alumnos:          resultados,
    };
  }

  // ── Ejecutar reinscripción masiva ────────────────────────────

  async ejecutarMasiva(dto: InscripcionMasivaDto, user: JwtPayload) {
    const preview = await this.previsualizarMasiva(dto, user);
    const aInscribir = preview.alumnos.filter((a) => !a.ya_inscripto);
    const hoy = new Date().toISOString().slice(0, 10);

    const creadas: string[] = [];
    for (const alumno of aInscribir) {
      await this.repo.create({
        institucion_id:    user.inst,
        alumno_id:         alumno.alumno_id,
        curso_id:          dto.curso_id_destino,
        ciclo_lectivo:     dto.ciclo_destino,
        estado:            'regular',
        fecha_inscripcion: hoy,
        creado_por:        user.sub,
      });
      creadas.push(alumno.alumno_id);
    }

    return {
      inscriptos:    creadas.length,
      ya_existian:   preview.ya_inscriptos,
      total_proceso: preview.total,
    };
  }

  // ── Exportar PDF ─────────────────────────────────────────────

  async exportPdf(cursoId: string, cicloLectivo: number, user: JwtPayload): Promise<Buffer> {
    const [meta, rows] = await Promise.all([
      this.repo.getCursoInstitucion(cursoId, user.inst),
      this.repo.findByCursoCiclo(cursoId, cicloLectivo, user.inst),
    ]);

    return this.pdfService.generateInscripcionesPdf({
      curso_nombre:       meta.curso_nombre,
      institucion_nombre: meta.institucion_nombre,
      ciclo_lectivo:      cicloLectivo,
      generado_at:        new Date(),
      inscripciones:      rows,
    });
  }

  // ── Cambiar estado ────────────────────────────────────────────

  async cambiarEstado(id: string, estado: 'regular' | 'libre' | 'baja', user: JwtPayload) {
    const updated = await this.repo.updateEstado(id, estado, user.inst);
    if (!updated) throw new NotFoundException('Inscripción no encontrada');
    return updated;
  }
}
