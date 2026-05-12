import { Injectable, Inject } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

// ─── Interfaces ──────────────────────────────────────────────

export interface Acta {
  id: string;
  institucion_id: string;
  curso_id: string;
  materia_id: string;
  periodo: string;
  anio_academico: number;
  estado: 'borrador' | 'cerrada';
  cerrada_por: string | null;
  cerrada_at: Date | null;
  creado_por: string;
  created_at: Date;
  updated_at: Date;
}

export interface Calificacion {
  id: string;
  acta_id: string;
  alumno_id: string;
  tipo: string;
  nota_valor: string;
  nota_numerica: number | null;
  observaciones: string | null;
  cargado_por: string;
  created_at: Date;
  updated_at: Date;
}

export interface CalificacionRow extends Calificacion {
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
}

export interface ActaConCalificaciones extends Acta {
  curso_nombre: string;
  materia_nombre: string;
  creado_por_nombre: string;
  calificaciones: CalificacionRow[];
  promedio_general: number | null;
}

export interface CalificacionAlumno {
  acta_id: string;
  curso_id: string;
  curso_nombre: string;
  materia_id: string;
  materia_nombre: string;
  periodo: string;
  anio_academico: number;
  estado_acta: string;
  tipo: string;
  nota_valor: string;
  nota_numerica: number | null;
  observaciones: string | null;
  created_at: Date;
}

// ─── Repository ──────────────────────────────────────────────

@Injectable()
export class CalificacionesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ─── ACTAS ────────────────────────────────────────────────

  async findActa(
    curso_id: string,
    materia_id: string,
    periodo: string,
    anio_academico: number,
    institucion_id: string,
  ): Promise<Acta | null> {
    const { rows } = await this.pool.query<Acta>(
      `SELECT * FROM actas
       WHERE curso_id = $1 AND materia_id = $2
         AND periodo = $3 AND anio_academico = $4
         AND institucion_id = $5`,
      [curso_id, materia_id, periodo, anio_academico, institucion_id],
    );
    return rows[0] ?? null;
  }

  async findActaById(acta_id: string, institucion_id: string): Promise<Acta | null> {
    const { rows } = await this.pool.query<Acta>(
      `SELECT * FROM actas WHERE id = $1 AND institucion_id = $2`,
      [acta_id, institucion_id],
    );
    return rows[0] ?? null;
  }

  async createActa(data: {
    institucion_id: string;
    curso_id: string;
    materia_id: string;
    periodo: string;
    anio_academico: number;
    creado_por: string;
  }): Promise<Acta> {
    const { rows } = await this.pool.query<Acta>(
      `INSERT INTO actas
         (institucion_id, curso_id, materia_id, periodo, anio_academico, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.institucion_id,
        data.curso_id,
        data.materia_id,
        data.periodo,
        data.anio_academico,
        data.creado_por,
      ],
    );
    return rows[0];
  }

  async getActaConCalificaciones(
    acta_id: string,
    institucion_id: string,
  ): Promise<ActaConCalificaciones | null> {
    const { rows: actaRows } = await this.pool.query(
      `SELECT
         a.*,
         c.nombre  AS curso_nombre,
         m.nombre  AS materia_nombre,
         u.nombre || ' ' || u.apellido AS creado_por_nombre,
         (SELECT AVG(cal.nota_numerica)
          FROM calificaciones cal
          WHERE cal.acta_id = a.id
            AND cal.nota_numerica IS NOT NULL
         ) AS promedio_general
       FROM actas a
       JOIN cursos   c ON c.id = a.curso_id
       JOIN materias m ON m.id = a.materia_id
       JOIN usuarios u ON u.id = a.creado_por
       WHERE a.id = $1 AND a.institucion_id = $2`,
      [acta_id, institucion_id],
    );

    if (!actaRows[0]) return null;

    const { rows: calRows } = await this.pool.query<CalificacionRow>(
      `SELECT
         cal.*,
         al.nombre   AS alumno_nombre,
         al.apellido AS alumno_apellido,
         al.numero_legajo AS alumno_legajo
       FROM calificaciones cal
       JOIN alumnos al ON al.id = cal.alumno_id
       WHERE cal.acta_id = $1
       ORDER BY al.apellido, al.nombre, cal.tipo`,
      [acta_id],
    );

    return { ...actaRows[0], calificaciones: calRows };
  }

  async cerrarActa(acta_id: string, cerrado_por: string): Promise<Acta> {
    const { rows } = await this.pool.query<Acta>(
      `UPDATE actas
       SET estado = 'cerrada', cerrada_por = $2, cerrada_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [acta_id, cerrado_por],
    );
    return rows[0];
  }

  async rectificarActa(acta_id: string): Promise<Acta> {
    const { rows } = await this.pool.query<Acta>(
      `UPDATE actas
       SET estado = 'borrador', cerrada_por = NULL, cerrada_at = NULL
       WHERE id = $1
       RETURNING *`,
      [acta_id],
    );
    return rows[0];
  }

  // ─── CALIFICACIONES ───────────────────────────────────────

  async upsertCalificacion(data: {
    acta_id: string;
    alumno_id: string;
    tipo: string;
    nota_valor: string;
    nota_numerica: number | null;
    observaciones: string | null;
    cargado_por: string;
  }): Promise<Calificacion> {
    const { rows } = await this.pool.query<Calificacion>(
      `INSERT INTO calificaciones
         (acta_id, alumno_id, tipo, nota_valor, nota_numerica, observaciones, cargado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (acta_id, alumno_id, tipo) DO UPDATE SET
         nota_valor    = EXCLUDED.nota_valor,
         nota_numerica = EXCLUDED.nota_numerica,
         observaciones = EXCLUDED.observaciones,
         cargado_por   = EXCLUDED.cargado_por,
         updated_at    = NOW()
       RETURNING *`,
      [
        data.acta_id,
        data.alumno_id,
        data.tipo,
        data.nota_valor,
        data.nota_numerica,
        data.observaciones ?? null,
        data.cargado_por,
      ],
    );
    return rows[0];
  }

  async bulkUpsertCalificaciones(
    acta_id: string,
    items: Array<{
      alumno_id: string;
      tipo: string;
      nota_valor: string;
      nota_numerica: number | null;
      observaciones: string | null;
    }>,
    cargado_por: string,
  ): Promise<Calificacion[]> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results: Calificacion[] = [];
      for (const item of items) {
        const { rows } = await client.query<Calificacion>(
          `INSERT INTO calificaciones
             (acta_id, alumno_id, tipo, nota_valor, nota_numerica, observaciones, cargado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (acta_id, alumno_id, tipo) DO UPDATE SET
             nota_valor    = EXCLUDED.nota_valor,
             nota_numerica = EXCLUDED.nota_numerica,
             observaciones = EXCLUDED.observaciones,
             cargado_por   = EXCLUDED.cargado_por,
             updated_at    = NOW()
           RETURNING *`,
          [
            acta_id,
            item.alumno_id,
            item.tipo,
            item.nota_valor,
            item.nota_numerica,
            item.observaciones ?? null,
            cargado_por,
          ],
        );
        results.push(rows[0]);
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── CONSULTAS POR ALUMNO ─────────────────────────────────

  async getCalificacionesAlumno(
    alumno_id: string,
    institucion_id: string,
  ): Promise<CalificacionAlumno[]> {
    const { rows } = await this.pool.query<CalificacionAlumno>(
      `SELECT
         a.id        AS acta_id,
         a.curso_id,
         c.nombre    AS curso_nombre,
         a.materia_id,
         m.nombre    AS materia_nombre,
         a.periodo,
         a.anio_academico,
         a.estado    AS estado_acta,
         cal.tipo,
         cal.nota_valor,
         cal.nota_numerica,
         cal.observaciones,
         cal.created_at
       FROM calificaciones cal
       JOIN actas    a ON a.id = cal.acta_id
       JOIN cursos   c ON c.id = a.curso_id
       JOIN materias m ON m.id = a.materia_id
       WHERE cal.alumno_id = $1 AND a.institucion_id = $2
       ORDER BY a.anio_academico DESC, a.periodo, m.nombre, cal.tipo`,
      [alumno_id, institucion_id],
    );
    return rows;
  }

  // ─── CONFIGURACIÓN INSTITUCIÓN ────────────────────────────

  async getInstitucionConfig(institucion_id: string): Promise<Record<string, unknown>> {
    const { rows } = await this.pool.query<{ config: Record<string, unknown> }>(
      `SELECT config FROM instituciones WHERE id = $1`,
      [institucion_id],
    );
    return rows[0]?.config ?? {};
  }

  // ─── PDF ──────────────────────────────────────────────────

  async updatePdfMeta(acta_id: string, hash: string, url: string | null): Promise<void> {
    await this.pool.query(
      `UPDATE actas SET pdf_hash = $1, pdf_url = $2, pdf_generado_at = NOW() WHERE id = $3`,
      [hash, url, acta_id],
    );
  }

  async getPdfMeta(acta_id: string): Promise<{ pdf_hash: string | null; pdf_generado_at: Date | null } | null> {
    const { rows } = await this.pool.query(
      `SELECT pdf_hash, pdf_generado_at FROM actas WHERE id = $1`,
      [acta_id],
    );
    return rows[0] ?? null;
  }

  async getBoletinData(
    alumno_id: string,
    periodo: string,
    anio_academico: number,
    institucion_id: string,
  ) {
    const { rows } = await this.pool.query(
      `SELECT
         al.nombre        AS alumno_nombre,
         al.apellido      AS alumno_apellido,
         al.numero_legajo AS alumno_legajo,
         al.dni           AS alumno_dni,
         m.nombre         AS materia_nombre,
         cal.tipo,
         cal.nota_valor,
         cal.nota_numerica
       FROM calificaciones cal
       JOIN actas    a  ON a.id  = cal.acta_id
       JOIN materias m  ON m.id  = a.materia_id
       JOIN alumnos  al ON al.id = cal.alumno_id
       WHERE cal.alumno_id    = $1
         AND a.periodo        = $2
         AND a.anio_academico = $3
         AND a.institucion_id = $4
       ORDER BY m.nombre, cal.tipo`,
      [alumno_id, periodo, anio_academico, institucion_id],
    );
    return rows;
  }

  // ─── CATÁLOGOS ────────────────────────────────────────────

  async getCursos(institucion_id: string) {
    const { rows } = await this.pool.query(
      `SELECT c.id, c.nombre, c.anio_academico, c.nivel, c.turno, c.activo,
              COALESCE(
                ARRAY_AGG(cm.materia_id ORDER BY cm.created_at)
                  FILTER (WHERE cm.materia_id IS NOT NULL),
                '{}'::UUID[]
              ) AS materia_ids
       FROM cursos c
       LEFT JOIN curso_materias cm ON cm.curso_id = c.id
       WHERE c.institucion_id = $1 AND c.activo = true
       GROUP BY c.id
       ORDER BY c.anio_academico DESC, c.nombre`,
      [institucion_id],
    );
    return rows;
  }

  async getMaterias(institucion_id: string) {
    const { rows } = await this.pool.query(
      `SELECT id, nombre, codigo
       FROM materias
       WHERE institucion_id = $1 AND activo = true
       ORDER BY nombre`,
      [institucion_id],
    );
    return rows;
  }

  async getAlumnosByCurso(curso_id: string) {
    const { rows } = await this.pool.query(
      `SELECT a.id, a.nombre, a.apellido, a.numero_legajo
       FROM alumnos a
       JOIN curso_alumnos ca ON ca.alumno_id = a.id
       WHERE ca.curso_id = $1 AND a.estado = 'activo'
       ORDER BY a.apellido, a.nombre`,
      [curso_id],
    );
    return rows;
  }

  // ─── AUDITORÍA ────────────────────────────────────────────

  async auditLog(data: {
    usuario_id?: string;
    accion: string;
    registro_id?: string;
    payload_before?: unknown;
    payload_after?: unknown;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log
         (usuario_id, accion, tabla, registro_id, payload_before, payload_after)
       VALUES ($1, $2, 'actas', $3, $4, $5)`,
      [
        data.usuario_id ?? null,
        data.accion,
        data.registro_id ?? null,
        data.payload_before ? JSON.stringify(data.payload_before) : null,
        data.payload_after  ? JSON.stringify(data.payload_after)  : null,
      ],
    );
  }
}
