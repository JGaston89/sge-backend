import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import type { CreateMesaDto, NotaItemDto } from './dto/examenes.dto';

@Injectable()
export class ExamenesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ─── Mesas ───────────────────────────────────────────────────

  async createMesa(institucionId: string, dto: CreateMesaDto, createdBy: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO mesas_examen
         (institucion_id, ciclo_id, materia_id, docente_id, fecha, hora,
          aula, cupo_maximo, fecha_limite_inscripcion, created_by, curso_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        institucionId,
        dto.ciclo_id             ?? null,
        dto.materia_id,
        dto.docente_id           ?? null,
        dto.fecha,
        dto.hora                 ?? null,
        dto.aula                 ?? null,
        dto.cupo_maximo          ?? 30,
        dto.fecha_limite_inscripcion ?? null,
        createdBy,
        dto.curso_id             ?? null,
      ],
    );
    return rows[0];
  }

  async findMesas(
    institucionId: string,
    opts: { ciclo_id?: string; materia_id?: string; estado?: string; curso_id?: string },
  ) {
    const conds: string[] = ['m.institucion_id = $1'];
    const params: unknown[] = [institucionId];
    let idx = 2;

    if (opts.ciclo_id) {
      conds.push(`m.ciclo_id = $${idx++}`);
      params.push(opts.ciclo_id);
    }
    if (opts.materia_id) {
      conds.push(`m.materia_id = $${idx++}`);
      params.push(opts.materia_id);
    }
    if (opts.estado) {
      conds.push(`m.estado = $${idx++}`);
      params.push(opts.estado);
    }
    if (opts.curso_id) {
      conds.push(`m.curso_id = $${idx++}`);
      params.push(opts.curso_id);
    }

    const { rows } = await this.pool.query(
      `SELECT
         m.*,
         mat.nombre                         AS materia_nombre,
         cl.nombre                          AS ciclo_nombre,
         ld.apellido || ' ' || ld.nombre    AS docente_nombre,
         cu.nombre                          AS curso_nombre,
         COUNT(ie.id)::int                  AS inscriptos
       FROM mesas_examen m
       LEFT JOIN materias       mat ON mat.id = m.materia_id
       LEFT JOIN ciclos_lectivos cl  ON cl.id  = m.ciclo_id
       LEFT JOIN legajos_docentes ld ON ld.id  = m.docente_id
       LEFT JOIN cursos          cu  ON cu.id  = m.curso_id
       LEFT JOIN inscripciones_examen ie
              ON ie.mesa_id = m.id AND ie.estado != 'anulada'
       WHERE ${conds.join(' AND ')}
       GROUP BY m.id, mat.nombre, cl.nombre, ld.apellido, ld.nombre, cu.nombre
       ORDER BY m.fecha ASC`,
      params,
    );
    return rows;
  }

  async findMesaById(id: string, institucionId: string) {
    const { rows: mesas } = await this.pool.query(
      `SELECT
         m.*,
         mat.nombre                         AS materia_nombre,
         cl.nombre                          AS ciclo_nombre,
         ld.apellido || ' ' || ld.nombre    AS docente_nombre,
         cu.nombre                          AS curso_nombre
       FROM mesas_examen m
       LEFT JOIN materias        mat ON mat.id = m.materia_id
       LEFT JOIN ciclos_lectivos cl   ON cl.id  = m.ciclo_id
       LEFT JOIN legajos_docentes ld  ON ld.id  = m.docente_id
       LEFT JOIN cursos          cu   ON cu.id  = m.curso_id
       WHERE m.id = $1 AND m.institucion_id = $2`,
      [id, institucionId],
    );
    if (!mesas[0]) return null;

    const { rows: inscriptos } = await this.pool.query(
      `SELECT
         ie.*,
         a.nombre          AS alumno_nombre,
         a.apellido        AS alumno_apellido,
         a.numero_legajo   AS alumno_legajo
       FROM inscripciones_examen ie
       JOIN alumnos a ON a.id = ie.alumno_id
       WHERE ie.mesa_id = $1
       ORDER BY a.apellido, a.nombre`,
      [id],
    );

    return { ...mesas[0], inscriptos };
  }

  async countInscriptos(mesaId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS n
       FROM inscripciones_examen
       WHERE mesa_id = $1 AND estado != 'anulada'`,
      [mesaId],
    );
    return rows[0].n;
  }

  async findInscripcion(mesaId: string, alumnoId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM inscripciones_examen
       WHERE mesa_id = $1 AND alumno_id = $2 AND estado != 'anulada'`,
      [mesaId, alumnoId],
    );
    return rows[0] ?? null;
  }

  async findInscripcionById(id: string, institucionId: string) {
    const { rows } = await this.pool.query(
      `SELECT ie.*, m.fecha AS mesa_fecha, m.estado AS mesa_estado
       FROM inscripciones_examen ie
       JOIN mesas_examen m ON m.id = ie.mesa_id
       WHERE ie.id = $1 AND ie.institucion_id = $2`,
      [id, institucionId],
    );
    return rows[0] ?? null;
  }

  async inscribir(mesaId: string, alumnoId: string, institucionId: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO inscripciones_examen (mesa_id, alumno_id, institucion_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [mesaId, alumnoId, institucionId],
    );
    return rows[0];
  }

  async desinscribir(id: string, institucionId: string) {
    const { rows } = await this.pool.query(
      `UPDATE inscripciones_examen
       SET estado = 'anulada', updated_at = NOW()
       WHERE id = $1 AND institucion_id = $2
       RETURNING *`,
      [id, institucionId],
    );
    return rows[0] ?? null;
  }

  async cargarNotas(mesaId: string, institucionId: string, items: NotaItemDto[]) {
    const updated: unknown[] = [];
    for (const item of items) {
      const notaConceptual =
        item.nota_numerica !== undefined
          ? item.nota_numerica >= 4 ? 'aprobado' : 'desaprobado'
          : null;

      const { rows } = await this.pool.query(
        `UPDATE inscripciones_examen
         SET estado          = $3,
             nota_numerica   = $4,
             nota_conceptual = $5,
             observaciones   = COALESCE($6, observaciones),
             updated_at      = NOW()
         WHERE mesa_id = $1 AND alumno_id = $2 AND institucion_id = $7
         RETURNING *`,
        [
          mesaId,
          item.alumno_id,
          item.estado,
          item.nota_numerica ?? null,
          notaConceptual,
          item.observaciones ?? null,
          institucionId,
        ],
      );
      if (rows[0]) updated.push(rows[0]);
    }
    return updated;
  }

  async cerrarMesa(id: string, institucionId: string) {
    const { rows } = await this.pool.query(
      `UPDATE mesas_examen
       SET estado = 'cerrada', updated_at = NOW()
       WHERE id = $1 AND institucion_id = $2
       RETURNING *`,
      [id, institucionId],
    );
    return rows[0] ?? null;
  }
}
