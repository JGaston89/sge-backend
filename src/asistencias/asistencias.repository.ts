import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { AsistenciaItemDto } from './dto/registrar-asistencia.dto';

export interface Asistencia {
  id: string;
  alumno_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
  materia_id: string;
  curso_id: string;
  ciclo_lectivo: number;
  fecha: string;
  estado: 'presente' | 'ausente' | 'tardanza' | 'justificado';
  observaciones: string | null;
  registrado_por: string;
  created_at: Date;
}

export interface AsistenciaResumenAlumno {
  alumno_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
  total_clases: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  justificados: number;
  porcentaje_asistencia: number;
}

export interface ClaseFecha {
  fecha: string;
  total: number;
  presentes: number;
}

@Injectable()
export class AsistenciasRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ─── REGISTRAR (BULK UPSERT) ──────────────────────────────

  async registrarBulk(data: {
    institucion_id: string;
    curso_id: string;
    materia_id: string;
    fecha: string;
    ciclo_lectivo: number;
    registrado_por: string;
    items: AsistenciaItemDto[];
  }): Promise<Asistencia[]> {
    if (data.items.length === 0) return [];

    const values = data.items.map((_, i) => {
      const base = i * 9;
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`;
    }).join(', ');

    const params: unknown[] = [];
    for (const item of data.items) {
      params.push(
        data.institucion_id,
        item.alumno_id,
        data.materia_id,
        data.curso_id,
        data.ciclo_lectivo,
        data.fecha,
        item.estado,
        item.observaciones ?? null,
        data.registrado_por,
      );
    }

    const { rows } = await this.pool.query<Asistencia>(
      `INSERT INTO asistencias
         (institucion_id, alumno_id, materia_id, curso_id, ciclo_lectivo, fecha, estado, observaciones, registrado_por)
       VALUES ${values}
       ON CONFLICT (alumno_id, materia_id, curso_id, fecha)
       DO UPDATE SET
         estado         = EXCLUDED.estado,
         observaciones  = EXCLUDED.observaciones,
         registrado_por = EXCLUDED.registrado_por,
         updated_at     = NOW()
       RETURNING id, alumno_id, materia_id, curso_id, ciclo_lectivo, fecha, estado, observaciones, registrado_por, created_at`,
      params,
    );

    return rows;
  }

  // ─── LISTAR POR CLASE (curso + materia + fecha) ───────────

  async findByClase(
    curso_id: string,
    materia_id: string,
    fecha: string,
    institucion_id: string,
  ): Promise<Asistencia[]> {
    const { rows } = await this.pool.query<Asistencia>(
      `SELECT a.id, a.alumno_id,
              al.nombre  AS alumno_nombre,
              al.apellido AS alumno_apellido,
              al.numero_legajo AS alumno_legajo,
              a.materia_id, a.curso_id, a.ciclo_lectivo,
              a.fecha::text, a.estado, a.observaciones,
              a.registrado_por, a.created_at
       FROM asistencias a
       JOIN alumnos al ON al.id = a.alumno_id
       WHERE a.curso_id = $1 AND a.materia_id = $2
         AND a.fecha = $3 AND a.institucion_id = $4
       ORDER BY al.apellido, al.nombre`,
      [curso_id, materia_id, fecha, institucion_id],
    );
    return rows;
  }

  // ─── RESUMEN POR CURSO/MATERIA/CICLO ──────────────────────

  async getResumen(
    curso_id: string,
    materia_id: string,
    ciclo_lectivo: number,
    institucion_id: string,
  ): Promise<AsistenciaResumenAlumno[]> {
    const { rows } = await this.pool.query<AsistenciaResumenAlumno>(
      `SELECT
         a.alumno_id,
         al.nombre         AS alumno_nombre,
         al.apellido       AS alumno_apellido,
         al.numero_legajo  AS alumno_legajo,
         COUNT(*)::int                                              AS total_clases,
         COUNT(*) FILTER (WHERE a.estado = 'presente')::int        AS presentes,
         COUNT(*) FILTER (WHERE a.estado = 'ausente')::int         AS ausentes,
         COUNT(*) FILTER (WHERE a.estado = 'tardanza')::int        AS tardanzas,
         COUNT(*) FILTER (WHERE a.estado = 'justificado')::int     AS justificados,
         ROUND(
           COUNT(*) FILTER (WHERE a.estado IN ('presente','tardanza','justificado'))::numeric
           / NULLIF(COUNT(*), 0) * 100, 1
         )::float                                                   AS porcentaje_asistencia
       FROM asistencias a
       JOIN alumnos al ON al.id = a.alumno_id
       WHERE a.curso_id = $1 AND a.materia_id = $2
         AND a.ciclo_lectivo = $3 AND a.institucion_id = $4
       GROUP BY a.alumno_id, al.nombre, al.apellido, al.numero_legajo
       ORDER BY al.apellido, al.nombre`,
      [curso_id, materia_id, ciclo_lectivo, institucion_id],
    );
    return rows;
  }

  // ─── FECHAS DE CLASE REGISTRADAS ──────────────────────────

  async getFechasClase(
    curso_id: string,
    materia_id: string,
    ciclo_lectivo: number,
    institucion_id: string,
  ): Promise<ClaseFecha[]> {
    const { rows } = await this.pool.query<ClaseFecha>(
      `SELECT
         fecha::text,
         COUNT(*)::int                                          AS total,
         COUNT(*) FILTER (WHERE estado = 'presente')::int      AS presentes
       FROM asistencias
       WHERE curso_id = $1 AND materia_id = $2
         AND ciclo_lectivo = $3 AND institucion_id = $4
       GROUP BY fecha
       ORDER BY fecha DESC`,
      [curso_id, materia_id, ciclo_lectivo, institucion_id],
    );
    return rows;
  }

  // ─── ASISTENCIA DE UN ALUMNO ──────────────────────────────

  async findByAlumno(
    alumno_id: string,
    ciclo_lectivo: number,
    institucion_id: string,
    materia_id?: string,
  ): Promise<Asistencia[]> {
    const { rows } = await this.pool.query<Asistencia>(
      `SELECT a.id, a.alumno_id,
              al.nombre AS alumno_nombre, al.apellido AS alumno_apellido,
              al.numero_legajo AS alumno_legajo,
              a.materia_id, a.curso_id, a.ciclo_lectivo,
              a.fecha::text, a.estado, a.observaciones,
              a.registrado_por, a.created_at
       FROM asistencias a
       JOIN alumnos al ON al.id = a.alumno_id
       WHERE a.alumno_id = $1 AND a.ciclo_lectivo = $2
         AND a.institucion_id = $3
         AND ($4::uuid IS NULL OR a.materia_id = $4)
       ORDER BY a.fecha DESC`,
      [alumno_id, ciclo_lectivo, institucion_id, materia_id ?? null],
    );
    return rows;
  }

  // ─── ACTUALIZAR UN REGISTRO ───────────────────────────────

  async updateOne(
    id: string,
    institucion_id: string,
    estado: string,
    observaciones?: string,
  ): Promise<Asistencia | null> {
    const { rows } = await this.pool.query<Asistencia>(
      `UPDATE asistencias
       SET estado = $3, observaciones = $4, updated_at = NOW()
       WHERE id = $1 AND institucion_id = $2
       RETURNING id, alumno_id, materia_id, curso_id, ciclo_lectivo,
                 fecha::text, estado, observaciones, registrado_por, created_at`,
      [id, institucion_id, estado, observaciones ?? null],
    );
    return rows[0] ?? null;
  }
}
