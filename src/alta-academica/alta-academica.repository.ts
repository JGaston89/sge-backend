import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

export interface CursoRow {
  id: string;
  nombre: string;
  anio_academico: number;
  nivel: string | null;
  turno: string | null;
  activo: boolean;
  created_at: Date;
  materia_ids: string[];
}

export interface MateriaRow {
  id: string;
  nombre: string;
  codigo: string | null;
  activo: boolean;
  created_at: Date;
}

export interface PeriodoRow {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: Date;
}

export interface CicloLectivoRow {
  id: string;
  anio: number;
  nombre: string;
  activo: boolean;
  created_at: Date;
}

@Injectable()
export class AltaAcademicaRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ─── CURSOS ───────────────────────────────────────────────

  async findCursos(institucion_id: string): Promise<CursoRow[]> {
    const { rows } = await this.pool.query<CursoRow>(
      `SELECT c.id, c.nombre, c.anio_academico, c.nivel, c.turno, c.activo, c.created_at,
              COALESCE(
                ARRAY_AGG(cm.materia_id ORDER BY cm.created_at)
                  FILTER (WHERE cm.materia_id IS NOT NULL),
                '{}'::UUID[]
              ) AS materia_ids
       FROM cursos c
       LEFT JOIN curso_materias cm ON cm.curso_id = c.id
       WHERE c.institucion_id = $1
       GROUP BY c.id
       ORDER BY c.anio_academico DESC, c.nombre`,
      [institucion_id],
    );
    return rows;
  }

  async syncCursoMaterias(curso_id: string, materia_ids: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM curso_materias WHERE curso_id = $1', [curso_id]);
      if (materia_ids.length > 0) {
        const values = materia_ids
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        await client.query(
          `INSERT INTO curso_materias (curso_id, materia_id) VALUES ${values}`,
          [curso_id, ...materia_ids],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createCurso(data: {
    institucion_id: string;
    nombre: string;
    anio_academico: number;
    nivel?: string;
    turno?: string;
  }): Promise<CursoRow> {
    const { rows } = await this.pool.query<CursoRow>(
      `INSERT INTO cursos (institucion_id, nombre, anio_academico, nivel, turno)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, anio_academico, nivel, turno, activo, created_at`,
      [data.institucion_id, data.nombre, data.anio_academico, data.nivel ?? null, data.turno ?? null],
    );
    return rows[0];
  }

  async updateCurso(id: string, institucion_id: string, data: {
    nombre?: string;
    anio_academico?: number;
    nivel?: string | null;
    turno?: string | null;
  }): Promise<CursoRow | null> {
    const { rows } = await this.pool.query<CursoRow>(
      `UPDATE cursos
       SET nombre         = COALESCE($3, nombre),
           anio_academico = COALESCE($4, anio_academico),
           nivel          = COALESCE($5, nivel),
           turno          = COALESCE($6, turno)
       WHERE id = $1 AND institucion_id = $2
       RETURNING id, nombre, anio_academico, nivel, turno, activo, created_at`,
      [id, institucion_id, data.nombre ?? null, data.anio_academico ?? null, data.nivel, data.turno],
    );
    return rows[0] ?? null;
  }

  async deleteCurso(id: string, institucion_id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE cursos SET activo = NOT activo WHERE id = $1 AND institucion_id = $2`,
      [id, institucion_id],
    );
    return (rowCount ?? 0) > 0;
  }

  // ─── MATERIAS ─────────────────────────────────────────────

  async findMaterias(institucion_id: string): Promise<MateriaRow[]> {
    const { rows } = await this.pool.query<MateriaRow>(
      `SELECT id, nombre, codigo, activo, created_at
       FROM materias
       WHERE institucion_id = $1
       ORDER BY nombre`,
      [institucion_id],
    );
    return rows;
  }

  async createMateria(data: {
    institucion_id: string;
    nombre: string;
    codigo?: string;
  }): Promise<MateriaRow> {
    const { rows } = await this.pool.query<MateriaRow>(
      `INSERT INTO materias (institucion_id, nombre, codigo)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, codigo, activo, created_at`,
      [data.institucion_id, data.nombre, data.codigo ?? null],
    );
    return rows[0];
  }

  async updateMateria(id: string, institucion_id: string, data: {
    nombre?: string;
    codigo?: string | null;
  }): Promise<MateriaRow | null> {
    const { rows } = await this.pool.query<MateriaRow>(
      `UPDATE materias
       SET nombre = COALESCE($3, nombre),
           codigo = COALESCE($4, codigo)
       WHERE id = $1 AND institucion_id = $2
       RETURNING id, nombre, codigo, activo, created_at`,
      [id, institucion_id, data.nombre ?? null, data.codigo],
    );
    return rows[0] ?? null;
  }

  async deleteMateria(id: string, institucion_id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE materias SET activo = NOT activo WHERE id = $1 AND institucion_id = $2`,
      [id, institucion_id],
    );
    return (rowCount ?? 0) > 0;
  }

  // ─── PERIODOS ─────────────────────────────────────────────

  async findPeriodos(institucion_id: string): Promise<PeriodoRow[]> {
    const { rows } = await this.pool.query<PeriodoRow>(
      `SELECT id, nombre, activo, created_at
       FROM periodos
       WHERE institucion_id = $1
       ORDER BY nombre`,
      [institucion_id],
    );
    return rows;
  }

  async createPeriodo(data: {
    institucion_id: string;
    nombre: string;
  }): Promise<PeriodoRow> {
    const { rows } = await this.pool.query<PeriodoRow>(
      `INSERT INTO periodos (institucion_id, nombre)
       VALUES ($1, $2)
       RETURNING id, nombre, activo, created_at`,
      [data.institucion_id, data.nombre],
    );
    return rows[0];
  }

  async updatePeriodo(id: string, institucion_id: string, nombre: string): Promise<PeriodoRow | null> {
    const { rows } = await this.pool.query<PeriodoRow>(
      `UPDATE periodos SET nombre = $3
       WHERE id = $1 AND institucion_id = $2
       RETURNING id, nombre, activo, created_at`,
      [id, institucion_id, nombre],
    );
    return rows[0] ?? null;
  }

  async deletePeriodo(id: string, institucion_id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE periodos SET activo = NOT activo WHERE id = $1 AND institucion_id = $2`,
      [id, institucion_id],
    );
    return (rowCount ?? 0) > 0;
  }

  // ─── CICLOS LECTIVOS ──────────────────────────────────────

  async findCiclos(institucion_id: string): Promise<CicloLectivoRow[]> {
    const { rows } = await this.pool.query<CicloLectivoRow>(
      `SELECT id, anio, nombre, activo, created_at
       FROM ciclos_lectivos
       WHERE institucion_id = $1
       ORDER BY anio DESC`,
      [institucion_id],
    );
    return rows;
  }

  async createCiclo(data: {
    institucion_id: string;
    anio: number;
    nombre: string;
  }): Promise<CicloLectivoRow> {
    const { rows } = await this.pool.query<CicloLectivoRow>(
      `INSERT INTO ciclos_lectivos (institucion_id, anio, nombre)
       VALUES ($1, $2, $3)
       RETURNING id, anio, nombre, activo, created_at`,
      [data.institucion_id, data.anio, data.nombre],
    );
    return rows[0];
  }

  async updateCiclo(id: string, institucion_id: string, data: {
    anio?: number;
    nombre?: string;
  }): Promise<CicloLectivoRow | null> {
    const { rows } = await this.pool.query<CicloLectivoRow>(
      `UPDATE ciclos_lectivos
       SET anio   = COALESCE($3, anio),
           nombre = COALESCE($4, nombre)
       WHERE id = $1 AND institucion_id = $2
       RETURNING id, anio, nombre, activo, created_at`,
      [id, institucion_id, data.anio ?? null, data.nombre ?? null],
    );
    return rows[0] ?? null;
  }

  async deleteCiclo(id: string, institucion_id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE ciclos_lectivos SET activo = NOT activo WHERE id = $1 AND institucion_id = $2`,
      [id, institucion_id],
    );
    return (rowCount ?? 0) > 0;
  }
}
