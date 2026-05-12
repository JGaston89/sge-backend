import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import type { CreatePlanificacionDto, UpdatePlanificacionDto } from './dto/planificacion.dto';

export interface Planificacion {
  id: string;
  institucion_id: string;
  materia_id: string;
  materia_nombre: string;
  curso_id: string;
  curso_nombre: string;
  ciclo_lectivo: number;
  docente_id: string | null;
  docente_nombre: string | null;
  estado: 'borrador' | 'enviada' | 'aprobada';
  objetivos: string | null;
  contenidos: { titulo: string; descripcion?: string }[];
  metodologia: string | null;
  criterios_evaluacion: string | null;
  observaciones: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class PlanificacionRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findAll(
    institucion_id: string,
    filters: { ciclo_lectivo?: number; curso_id?: string; materia_id?: string; estado?: string },
  ): Promise<Planificacion[]> {
    const conditions: string[] = ['p.institucion_id = $1'];
    const params: unknown[] = [institucion_id];
    let idx = 2;

    if (filters.ciclo_lectivo) {
      conditions.push(`p.ciclo_lectivo = $${idx++}`);
      params.push(filters.ciclo_lectivo);
    }
    if (filters.curso_id) {
      conditions.push(`p.curso_id = $${idx++}`);
      params.push(filters.curso_id);
    }
    if (filters.materia_id) {
      conditions.push(`p.materia_id = $${idx++}`);
      params.push(filters.materia_id);
    }
    if (filters.estado) {
      conditions.push(`p.estado = $${idx++}`);
      params.push(filters.estado);
    }

    const { rows } = await this.pool.query<Planificacion>(
      `SELECT p.*,
              m.nombre  AS materia_nombre,
              c.nombre  AS curso_nombre,
              u.nombre  || ' ' || u.apellido AS docente_nombre
         FROM planificaciones p
         JOIN materias m ON m.id = p.materia_id
         JOIN cursos   c ON c.id = p.curso_id
    LEFT JOIN usuarios u ON u.id = p.docente_id
        WHERE ${conditions.join(' AND ')}
     ORDER BY p.ciclo_lectivo DESC, c.nombre, m.nombre`,
      params,
    );
    return rows;
  }

  async findOne(id: string, institucion_id: string): Promise<Planificacion> {
    const { rows } = await this.pool.query<Planificacion>(
      `SELECT p.*,
              m.nombre  AS materia_nombre,
              c.nombre  AS curso_nombre,
              u.nombre  || ' ' || u.apellido AS docente_nombre
         FROM planificaciones p
         JOIN materias m ON m.id = p.materia_id
         JOIN cursos   c ON c.id = p.curso_id
    LEFT JOIN usuarios u ON u.id = p.docente_id
        WHERE p.id = $1 AND p.institucion_id = $2`,
      [id, institucion_id],
    );
    if (!rows[0]) throw new NotFoundException('Planificación no encontrada');
    return rows[0];
  }

  async create(institucion_id: string, dto: CreatePlanificacionDto): Promise<Planificacion> {
    const { rows } = await this.pool.query<{ id: string }>(
      `INSERT INTO planificaciones
         (institucion_id, materia_id, curso_id, ciclo_lectivo, docente_id,
          objetivos, contenidos, metodologia, criterios_evaluacion, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        institucion_id,
        dto.materia_id,
        dto.curso_id,
        dto.ciclo_lectivo,
        dto.docente_id ?? null,
        dto.objetivos ?? null,
        JSON.stringify(dto.contenidos ?? []),
        dto.metodologia ?? null,
        dto.criterios_evaluacion ?? null,
        dto.observaciones ?? null,
      ],
    );
    return this.findOne(rows[0].id, institucion_id);
  }

  async update(id: string, institucion_id: string, dto: UpdatePlanificacionDto): Promise<Planificacion> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fields: (keyof UpdatePlanificacionDto)[] = [
      'estado', 'docente_id', 'objetivos', 'metodologia', 'criterios_evaluacion', 'observaciones',
    ];
    for (const field of fields) {
      if (dto[field] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(dto[field]);
      }
    }
    if (dto.contenidos !== undefined) {
      sets.push(`contenidos = $${idx++}`);
      params.push(JSON.stringify(dto.contenidos));
    }

    if (!sets.length) return this.findOne(id, institucion_id);

    params.push(id, institucion_id);
    await this.pool.query(
      `UPDATE planificaciones SET ${sets.join(', ')}
        WHERE id = $${idx++} AND institucion_id = $${idx++}`,
      params,
    );
    return this.findOne(id, institucion_id);
  }

  async remove(id: string, institucion_id: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM planificaciones WHERE id = $1 AND institucion_id = $2`,
      [id, institucion_id],
    );
    if (!rowCount) throw new NotFoundException('Planificación no encontrada');
  }

  // ─── Aprobación ──────────────────────────────────────────────

  async aprobar(id: string, institucion_id: string): Promise<Planificacion> {
    const { rowCount } = await this.pool.query(
      `UPDATE planificaciones
       SET estado = 'aprobada', updated_at = NOW()
       WHERE id = $1 AND institucion_id = $2 AND estado = 'enviada'`,
      [id, institucion_id],
    );
    if (!rowCount) throw new NotFoundException(
      'Planificación no encontrada o no está en estado "enviada"',
    );
    return this.findOne(id, institucion_id);
  }

  // ─── Avance ──────────────────────────────────────────────────

  async getAvance(
    institucion_id: string,
    opts: { materia_id?: string; ciclo_lectivo?: number },
  ) {
    const conds = ['p.institucion_id = $1'];
    const params: unknown[] = [institucion_id];
    let idx = 2;

    if (opts.materia_id) {
      conds.push(`p.materia_id = $${idx++}`);
      params.push(opts.materia_id);
    }
    if (opts.ciclo_lectivo) {
      conds.push(`p.ciclo_lectivo = $${idx++}`);
      params.push(opts.ciclo_lectivo);
    }

    const { rows } = await this.pool.query(
      `SELECT
         p.id,
         p.ciclo_lectivo,
         p.estado,
         m.nombre                              AS materia_nombre,
         c.nombre                              AS curso_nombre,
         JSONB_ARRAY_LENGTH(p.contenidos)      AS total_contenidos,
         COUNT(cd.id)::int                     AS clases_dictadas,
         CASE
           WHEN JSONB_ARRAY_LENGTH(p.contenidos) = 0 THEN 0
           ELSE ROUND(
             (COUNT(cd.id)::numeric / JSONB_ARRAY_LENGTH(p.contenidos)) * 100, 1
           )
         END                                   AS porcentaje_avance
       FROM planificaciones p
       JOIN materias m ON m.id = p.materia_id
       JOIN cursos   c ON c.id = p.curso_id
       LEFT JOIN clases_dictadas cd ON cd.planificacion_id = p.id
       WHERE ${conds.join(' AND ')}
       GROUP BY p.id, m.nombre, c.nombre
       ORDER BY p.ciclo_lectivo DESC, c.nombre, m.nombre`,
      params,
    );
    return rows;
  }

  // ─── Diario de clases ────────────────────────────────────────

  async createClaseDictada(
    institucion_id: string,
    dto: { planificacion_id: string; docente_id?: string; fecha: string; contenidos_trabajados: string; observaciones?: string },
  ) {
    const { rows } = await this.pool.query(
      `INSERT INTO clases_dictadas
         (institucion_id, planificacion_id, docente_id, fecha, contenidos_trabajados, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        institucion_id,
        dto.planificacion_id,
        dto.docente_id ?? null,
        dto.fecha,
        dto.contenidos_trabajados,
        dto.observaciones ?? null,
      ],
    );
    return rows[0];
  }

  async findClasesDictadas(planificacion_id: string, institucion_id: string) {
    const { rows } = await this.pool.query(
      `SELECT cd.*,
              ld.apellido || ' ' || ld.nombre AS docente_nombre
       FROM clases_dictadas cd
       LEFT JOIN legajos_docentes ld ON ld.id = cd.docente_id
       WHERE cd.planificacion_id = $1 AND cd.institucion_id = $2
       ORDER BY cd.fecha DESC`,
      [planificacion_id, institucion_id],
    );
    return rows;
  }

  // ─── PDF data ────────────────────────────────────────────────

  async getPdfData(id: string, institucion_id: string) {
    const plan = await this.findOne(id, institucion_id);
    const clases = await this.findClasesDictadas(id, institucion_id);
    return { plan, clases };
  }
}
