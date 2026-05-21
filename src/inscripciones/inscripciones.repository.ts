import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

export interface InscripcionRow {
  id: string;
  institucion_id: string;
  alumno_id: string;
  curso_id: string;
  ciclo_lectivo: number;
  estado: 'regular' | 'libre' | 'baja';
  fecha_inscripcion: string;
  observaciones: string | null;
  creado_por: string;
  created_at: Date;
  updated_at: Date;
  // JOINs
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
  curso_nombre: string;
}

@Injectable()
export class InscripcionesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ── Crear inscripción ────────────────────────────────────────

  async create(data: {
    institucion_id: string;
    alumno_id: string;
    curso_id: string;
    ciclo_lectivo: number;
    estado: string;
    fecha_inscripcion: string;
    observaciones?: string;
    creado_por: string;
  }): Promise<InscripcionRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query<InscripcionRow>(
        `INSERT INTO inscripciones
           (institucion_id, alumno_id, curso_id, ciclo_lectivo,
            estado, fecha_inscripcion, observaciones, creado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          data.institucion_id,
          data.alumno_id,
          data.curso_id,
          data.ciclo_lectivo,
          data.estado,
          data.fecha_inscripcion,
          data.observaciones ?? null,
          data.creado_por,
        ],
      );

      // Sincronizar con curso_alumnos si estado es regular o libre
      if (data.estado !== 'baja') {
        await client.query(
          `INSERT INTO curso_alumnos (curso_id, alumno_id, fecha_inscripcion)
           VALUES ($1, $2, $3)
           ON CONFLICT (curso_id, alumno_id) DO NOTHING`,
          [data.curso_id, data.alumno_id, data.fecha_inscripcion],
        );
      }

      await client.query('COMMIT');
      return rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ── Listar por curso + ciclo ─────────────────────────────────

  async findByCursoCiclo(
    cursoId: string,
    cicloLectivo: number,
    institucionId: string,
  ): Promise<InscripcionRow[]> {
    const { rows } = await this.pool.query<InscripcionRow>(
      `SELECT i.*,
              a.nombre   AS alumno_nombre,
              a.apellido AS alumno_apellido,
              a.numero_legajo AS alumno_legajo,
              c.nombre   AS curso_nombre
       FROM inscripciones i
       JOIN alumnos a ON a.id = i.alumno_id
       JOIN cursos  c ON c.id = i.curso_id
       WHERE i.curso_id = $1
         AND i.ciclo_lectivo = $2
         AND i.institucion_id = $3
       ORDER BY a.apellido, a.nombre`,
      [cursoId, cicloLectivo, institucionId],
    );
    return rows;
  }

  // ── Historial de un alumno ────────────────────────────────────

  async findByAlumno(alumnoId: string, institucionId: string): Promise<InscripcionRow[]> {
    const { rows } = await this.pool.query<InscripcionRow>(
      `SELECT i.*,
              a.nombre   AS alumno_nombre,
              a.apellido AS alumno_apellido,
              a.numero_legajo AS alumno_legajo,
              c.nombre   AS curso_nombre
       FROM inscripciones i
       JOIN alumnos a ON a.id = i.alumno_id
       JOIN cursos  c ON c.id = i.curso_id
       WHERE i.alumno_id = $1
         AND i.institucion_id = $2
       ORDER BY i.ciclo_lectivo DESC, c.nombre`,
      [alumnoId, institucionId],
    );
    return rows;
  }

  // ── Nombre de curso e institución ────────────────────────────

  async getCursoInstitucion(curso_id: string, institucion_id: string) {
    const { rows } = await this.pool.query<{ curso_nombre: string; institucion_nombre: string }>(
      `SELECT c.nombre AS curso_nombre, inst.nombre AS institucion_nombre
       FROM cursos c
       JOIN instituciones inst ON inst.id = c.institucion_id
       WHERE c.id = $1 AND c.institucion_id = $2`,
      [curso_id, institucion_id],
    );
    return rows[0] ?? { curso_nombre: '—', institucion_nombre: '—' };
  }

  // ── Buscar regulares de un curso/ciclo (para masiva) ─────────

  async findRegularesByCursoCiclo(
    cursoId: string,
    cicloLectivo: number,
    institucionId: string,
  ): Promise<InscripcionRow[]> {
    const { rows } = await this.pool.query<InscripcionRow>(
      `SELECT i.*,
              a.nombre   AS alumno_nombre,
              a.apellido AS alumno_apellido,
              a.numero_legajo AS alumno_legajo,
              c.nombre   AS curso_nombre
       FROM inscripciones i
       JOIN alumnos a ON a.id = i.alumno_id
       JOIN cursos  c ON c.id = i.curso_id
       WHERE i.curso_id = $1
         AND i.ciclo_lectivo = $2
         AND i.institucion_id = $3
         AND i.estado = 'regular'
         AND a.estado = 'activo'
       ORDER BY a.apellido, a.nombre`,
      [cursoId, cicloLectivo, institucionId],
    );
    return rows;
  }

  // ── Verificar duplicado mismo curso ──────────────────────────

  async exists(alumnoId: string, cursoId: string, cicloLectivo: number): Promise<boolean> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM inscripciones
       WHERE alumno_id = $1 AND curso_id = $2 AND ciclo_lectivo = $3`,
      [alumnoId, cursoId, cicloLectivo],
    );
    return Number(rows[0].count) > 0;
  }

  // ── Verificar si alumno ya tiene inscripción activa en el ciclo ─

  async existsEnCiclo(alumnoId: string, cicloLectivo: number): Promise<boolean> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM inscripciones
       WHERE alumno_id = $1 AND ciclo_lectivo = $2 AND estado != 'baja'`,
      [alumnoId, cicloLectivo],
    );
    return Number(rows[0].count) > 0;
  }

  // ── Todos los alumnos no dados de baja de un curso/ciclo ─────
  // Usado por masiva para que el usuario pueda ver y desseleccionar

  async findTodosByCursoCiclo(
    cursoId: string,
    cicloLectivo: number,
    institucionId: string,
  ): Promise<InscripcionRow[]> {
    const { rows } = await this.pool.query<InscripcionRow>(
      `SELECT i.*,
              a.nombre   AS alumno_nombre,
              a.apellido AS alumno_apellido,
              a.numero_legajo AS alumno_legajo,
              c.nombre   AS curso_nombre
       FROM inscripciones i
       JOIN alumnos a ON a.id = i.alumno_id
       JOIN cursos  c ON c.id = i.curso_id
       WHERE i.curso_id = $1
         AND i.ciclo_lectivo = $2
         AND i.institucion_id = $3
         AND i.estado != 'baja'
         AND a.estado = 'activo'
       ORDER BY a.apellido, a.nombre`,
      [cursoId, cicloLectivo, institucionId],
    );
    return rows;
  }

  // ── Alumnos activos sin inscripción en el ciclo dado ─────────

  async findAlumnosDisponibles(
    cicloLectivo: number,
    institucionId: string,
  ): Promise<Array<{ id: string; nombre: string; apellido: string; numero_legajo: string }>> {
    const { rows } = await this.pool.query(
      `SELECT a.id, a.nombre, a.apellido, a.numero_legajo
       FROM alumnos a
       WHERE a.estado = 'activo'
         AND a.institucion_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM inscripciones i
           WHERE i.alumno_id = a.id
             AND i.ciclo_lectivo = $2
             AND i.estado != 'baja'
         )
       ORDER BY a.apellido, a.nombre`,
      [institucionId, cicloLectivo],
    );
    return rows;
  }

  // ── Cambiar estado ────────────────────────────────────────────

  async updateEstado(
    id: string,
    estado: string,
    institucionId: string,
  ): Promise<InscripcionRow | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query<InscripcionRow>(
        `UPDATE inscripciones
         SET estado = $1, updated_at = NOW()
         WHERE id = $2 AND institucion_id = $3
         RETURNING *`,
        [estado, id, institucionId],
      );

      if (!rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      // Sincronizar curso_alumnos: baja → remover; recuperar → re-agregar
      if (estado === 'baja') {
        await client.query(
          `DELETE FROM curso_alumnos
           WHERE curso_id = $1 AND alumno_id = $2`,
          [rows[0].curso_id, rows[0].alumno_id],
        );
      } else {
        await client.query(
          `INSERT INTO curso_alumnos (curso_id, alumno_id, fecha_inscripcion)
           VALUES ($1, $2, $3)
           ON CONFLICT (curso_id, alumno_id) DO NOTHING`,
          [rows[0].curso_id, rows[0].alumno_id, rows[0].fecha_inscripcion],
        );
      }

      await client.query('COMMIT');
      return rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
