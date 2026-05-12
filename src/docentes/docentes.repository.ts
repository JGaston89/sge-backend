import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import type { CreateDocenteDto, UpdateDocenteDto, CreateAsignacionDto } from './dto/docentes.dto';

export interface LegajoDocente {
  id: string;
  institucion_id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  titulo: string | null;
  especialidades: string[];
  fecha_ingreso: string | null;
  estado: 'activo' | 'inactivo' | 'licencia';
  observaciones: string | null;
  total_asignaciones: number;
  created_at: Date;
  updated_at: Date;
}

export interface Asignacion {
  id: string;
  institucion_id: string;
  docente_id: string;
  docente_nombre: string;
  docente_apellido: string;
  materia_id: string;
  materia_nombre: string;
  curso_id: string;
  curso_nombre: string;
  ciclo_lectivo: number;
  horas_semanales: number | null;
  created_at: Date;
}

@Injectable()
export class DocentesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ── Legajos ──────────────────────────────────────────────────

  async findAll(
    institucion_id: string,
    filters: { estado?: string; search?: string },
  ): Promise<LegajoDocente[]> {
    const conditions: string[] = ['ld.institucion_id = $1'];
    const params: unknown[] = [institucion_id];
    let idx = 2;

    if (filters.estado) {
      conditions.push(`ld.estado = $${idx++}`);
      params.push(filters.estado);
    }
    if (filters.search) {
      conditions.push(
        `(ld.nombre ILIKE $${idx} OR ld.apellido ILIKE $${idx} OR ld.dni ILIKE $${idx})`,
      );
      params.push(`%${filters.search}%`);
      idx++;
    }

    const { rows } = await this.pool.query<LegajoDocente>(
      `SELECT ld.*,
              u.nombre || ' ' || u.apellido AS usuario_nombre,
              COUNT(a.id)::int              AS total_asignaciones
         FROM legajos_docentes ld
    LEFT JOIN usuarios    u ON u.id = ld.usuario_id
    LEFT JOIN asignaciones a ON a.docente_id = ld.id
        WHERE ${conditions.join(' AND ')}
     GROUP BY ld.id, u.nombre, u.apellido
     ORDER BY ld.apellido, ld.nombre`,
      params,
    );
    return rows;
  }

  async findOne(id: string, institucion_id: string): Promise<LegajoDocente> {
    const { rows } = await this.pool.query<LegajoDocente>(
      `SELECT ld.*,
              u.nombre || ' ' || u.apellido AS usuario_nombre,
              COUNT(a.id)::int              AS total_asignaciones
         FROM legajos_docentes ld
    LEFT JOIN usuarios    u ON u.id = ld.usuario_id
    LEFT JOIN asignaciones a ON a.docente_id = ld.id
        WHERE ld.id = $1 AND ld.institucion_id = $2
     GROUP BY ld.id, u.nombre, u.apellido`,
      [id, institucion_id],
    );
    if (!rows[0]) throw new NotFoundException('Docente no encontrado');
    return rows[0];
  }

  async create(institucion_id: string, dto: CreateDocenteDto): Promise<LegajoDocente> {
    const { rows } = await this.pool.query<{ id: string }>(
      `INSERT INTO legajos_docentes
         (institucion_id, usuario_id, nombre, apellido, dni, email, telefono,
          titulo, especialidades, fecha_ingreso, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        institucion_id,
        dto.usuario_id ?? null,
        dto.nombre,
        dto.apellido,
        dto.dni ?? null,
        dto.email ?? null,
        dto.telefono ?? null,
        dto.titulo ?? null,
        dto.especialidades ?? [],
        dto.fecha_ingreso ?? null,
        dto.observaciones ?? null,
      ],
    );
    return this.findOne(rows[0].id, institucion_id);
  }

  async update(id: string, institucion_id: string, dto: UpdateDocenteDto): Promise<LegajoDocente> {
    const fields: (keyof UpdateDocenteDto)[] = [
      'usuario_id', 'nombre', 'apellido', 'dni', 'email', 'telefono',
      'titulo', 'fecha_ingreso', 'estado', 'observaciones',
    ];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const f of fields) {
      if (dto[f] !== undefined) {
        sets.push(`${f} = $${idx++}`);
        params.push(dto[f]);
      }
    }
    if (dto.especialidades !== undefined) {
      sets.push(`especialidades = $${idx++}`);
      params.push(dto.especialidades);
    }
    if (!sets.length) return this.findOne(id, institucion_id);

    params.push(id, institucion_id);
    await this.pool.query(
      `UPDATE legajos_docentes SET ${sets.join(', ')}
        WHERE id = $${idx++} AND institucion_id = $${idx++}`,
      params,
    );
    return this.findOne(id, institucion_id);
  }

  async remove(id: string, institucion_id: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM legajos_docentes WHERE id = $1 AND institucion_id = $2`,
      [id, institucion_id],
    );
    if (!rowCount) throw new NotFoundException('Docente no encontrado');
  }

  // ── Asignaciones ─────────────────────────────────────────────

  async findAsignaciones(
    institucion_id: string,
    filters: { docente_id?: string; materia_id?: string; curso_id?: string; ciclo_lectivo?: number },
  ): Promise<Asignacion[]> {
    const conditions: string[] = ['a.institucion_id = $1'];
    const params: unknown[] = [institucion_id];
    let idx = 2;

    if (filters.docente_id) {
      conditions.push(`a.docente_id = $${idx++}`);
      params.push(filters.docente_id);
    }
    if (filters.materia_id) {
      conditions.push(`a.materia_id = $${idx++}`);
      params.push(filters.materia_id);
    }
    if (filters.curso_id) {
      conditions.push(`a.curso_id = $${idx++}`);
      params.push(filters.curso_id);
    }
    if (filters.ciclo_lectivo) {
      conditions.push(`a.ciclo_lectivo = $${idx++}`);
      params.push(filters.ciclo_lectivo);
    }

    const { rows } = await this.pool.query<Asignacion>(
      `SELECT a.*,
              ld.nombre    AS docente_nombre,
              ld.apellido  AS docente_apellido,
              m.nombre     AS materia_nombre,
              c.nombre     AS curso_nombre
         FROM asignaciones a
         JOIN legajos_docentes ld ON ld.id = a.docente_id
         JOIN materias          m ON m.id  = a.materia_id
         JOIN cursos            c ON c.id  = a.curso_id
        WHERE ${conditions.join(' AND ')}
     ORDER BY a.ciclo_lectivo DESC, ld.apellido, m.nombre`,
      params,
    );
    return rows;
  }

  async createAsignacion(institucion_id: string, dto: CreateAsignacionDto): Promise<Asignacion> {
    try {
      const { rows } = await this.pool.query<{ id: string }>(
        `INSERT INTO asignaciones
           (institucion_id, docente_id, materia_id, curso_id, ciclo_lectivo, horas_semanales)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [
          institucion_id,
          dto.docente_id,
          dto.materia_id,
          dto.curso_id,
          dto.ciclo_lectivo,
          dto.horas_semanales ?? null,
        ],
      );
      const { rows: result } = await this.pool.query<Asignacion>(
        `SELECT a.*, ld.nombre AS docente_nombre, ld.apellido AS docente_apellido,
                m.nombre AS materia_nombre, c.nombre AS curso_nombre
           FROM asignaciones a
           JOIN legajos_docentes ld ON ld.id = a.docente_id
           JOIN materias m ON m.id = a.materia_id
           JOIN cursos   c ON c.id = a.curso_id
          WHERE a.id = $1`,
        [rows[0].id],
      );
      return result[0];
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException('El docente ya está asignado a esa materia/curso/ciclo');
      throw err;
    }
  }

  async removeAsignacion(id: string, institucion_id: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM asignaciones WHERE id = $1 AND institucion_id = $2`,
      [id, institucion_id],
    );
    if (!rowCount) throw new NotFoundException('Asignación no encontrada');
  }
}
