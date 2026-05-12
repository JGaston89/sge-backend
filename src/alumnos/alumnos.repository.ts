import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { UpdateAlumnoDto } from './dto/update-alumno.dto';

// ─── Interfaces ──────────────────────────────────────────────

export interface ContactoEmergencia {
  nombre: string;
  relacion: 'padre' | 'madre' | 'tutor' | 'otro';
  telefono?: string;
  email?: string;
}

export interface Alumno {
  id: string;
  institucion_id: string;
  numero_legajo: string;
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: Date | null;
  genero: string | null;
  nacionalidad: string | null;
  email: string | null;
  telefono: string | null;
  domicilio: string | null;
  contactos: ContactoEmergencia[];
  estado: 'activo' | 'baja' | 'egresado';
  fecha_baja: Date | null;
  motivo_baja: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AlumnoPage {
  items: Alumno[];
  next_cursor: string | null;
  total: number;
}

export interface AlumnoEnRiesgo {
  id: string;
  nombre: string;
  apellido: string;
  numero_legajo: string;
  estado_inscripcion: 'regular' | 'libre';
  curso_nombre: string;
  promedio_general: number | null;
  materias_en_riesgo: number;
  materias_con_notas: number;
}

export interface HistorialEntry {
  id: number;
  usuario_id: string | null;
  accion: string;
  payload_before: unknown;
  payload_after: unknown;
  created_at: Date;
}

// ─── Repository ──────────────────────────────────────────────

@Injectable()
export class AlumnosRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ─── LEGAJO ───────────────────────────────────────────────

  async generarNumeroLegajo(institucionId: string): Promise<string> {
    const anio = new Date().getFullYear();
    const { rows } = await this.pool.query<{ ultimo_numero: number }>(
      `INSERT INTO legajo_secuencias (institucion_id, anio, ultimo_numero)
       VALUES ($1, $2, 1)
       ON CONFLICT (institucion_id, anio)
       DO UPDATE SET ultimo_numero = legajo_secuencias.ultimo_numero + 1
       RETURNING ultimo_numero`,
      [institucionId, anio],
    );
    const num = rows[0].ultimo_numero;
    return `ALU-${anio}-${num.toString().padStart(5, '0')}`;
  }

  // ─── CRUD ─────────────────────────────────────────────────

  async create(
    institucionId: string,
    dto: CreateAlumnoDto,
    numeroLegajo: string,
  ): Promise<Alumno> {
    const { rows } = await this.pool.query<Alumno>(
      `INSERT INTO alumnos
         (institucion_id, numero_legajo, dni, nombre, apellido,
          fecha_nacimiento, genero, nacionalidad,
          email, telefono, domicilio, contactos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        institucionId,
        numeroLegajo,
        dto.dni,
        dto.nombre.trim(),
        dto.apellido.trim(),
        dto.fecha_nacimiento ?? null,
        dto.genero ?? null,
        dto.nacionalidad ?? null,
        dto.email ?? null,
        dto.telefono ?? null,
        dto.domicilio ?? null,
        JSON.stringify(dto.contactos ?? []),
      ],
    );
    return rows[0];
  }

  async findAll(
    institucionId: string,
    opts: {
      q?: string;
      estado?: string;
      cursor?: string;
      limit: number;
    },
  ): Promise<AlumnoPage> {
    const baseParams: unknown[] = [institucionId];
    const baseConditions: string[] = ['a.institucion_id = $1'];
    let idx = 2;

    if (opts.q) {
      const like = `%${opts.q}%`;
      baseConditions.push(
        `(a.nombre ILIKE $${idx} OR a.apellido ILIKE $${idx} OR a.dni ILIKE $${idx}` +
        ` OR (a.apellido || ' ' || a.nombre) ILIKE $${idx}` +
        ` OR (a.nombre || ' ' || a.apellido) ILIKE $${idx})`,
      );
      baseParams.push(like);
      idx++;
    }

    if (opts.estado) {
      baseConditions.push(`a.estado = $${idx}`);
      baseParams.push(opts.estado);
      idx++;
    }

    const baseWhere = baseConditions.join(' AND ');

    // COUNT total (sin cursor para reflejar el universo real de resultados)
    const { rows: countRows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM alumnos a WHERE ${baseWhere}`,
      baseParams,
    );
    const total = parseInt(countRows[0].count, 10);

    // Agregar cursor para paginación
    const pageParams = [...baseParams];
    const pageConditions = [...baseConditions];

    if (opts.cursor) {
      const decoded = Buffer.from(opts.cursor, 'base64url').toString('utf8');
      const sepIdx = decoded.lastIndexOf(':');
      const createdAt = decoded.slice(0, sepIdx);
      const cursorId = decoded.slice(sepIdx + 1);
      pageConditions.push(
        `(a.created_at, a.id) < ($${idx}::timestamptz, $${idx + 1}::uuid)`,
      );
      pageParams.push(createdAt, cursorId);
      idx += 2;
    }

    pageParams.push(opts.limit + 1);
    const pageWhere = pageConditions.join(' AND ');

    const { rows } = await this.pool.query<Alumno>(
      `SELECT * FROM alumnos a
       WHERE ${pageWhere}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${idx}`,
      pageParams,
    );

    const hasMore = rows.length > opts.limit;
    const items = hasMore ? rows.slice(0, opts.limit) : rows;

    let next_cursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      next_cursor = Buffer.from(
        `${new Date(last.created_at).toISOString()}:${last.id}`,
      ).toString('base64url');
    }

    return { items, next_cursor, total };
  }

  async findById(id: string, institucionId: string): Promise<Alumno | null> {
    const { rows } = await this.pool.query<Alumno>(
      `SELECT * FROM alumnos WHERE id = $1 AND institucion_id = $2`,
      [id, institucionId],
    );
    return rows[0] ?? null;
  }

  async findByDni(dni: string, institucionId: string): Promise<Alumno | null> {
    const { rows } = await this.pool.query<Alumno>(
      `SELECT * FROM alumnos WHERE dni = $1 AND institucion_id = $2`,
      [dni, institucionId],
    );
    return rows[0] ?? null;
  }

  async update(
    id: string,
    institucionId: string,
    dto: UpdateAlumnoDto,
  ): Promise<Alumno> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const set = (col: string, val: unknown) => {
      fields.push(`${col} = $${idx++}`);
      params.push(val);
    };

    if (dto.nombre          !== undefined) set('nombre',           dto.nombre!.trim());
    if (dto.apellido        !== undefined) set('apellido',         dto.apellido!.trim());
    if (dto.fecha_nacimiento !== undefined) set('fecha_nacimiento', dto.fecha_nacimiento ?? null);
    if (dto.genero          !== undefined) set('genero',           dto.genero ?? null);
    if (dto.nacionalidad    !== undefined) set('nacionalidad',     dto.nacionalidad ?? null);
    if (dto.email           !== undefined) set('email',            dto.email ?? null);
    if (dto.telefono        !== undefined) set('telefono',         dto.telefono ?? null);
    if (dto.domicilio       !== undefined) set('domicilio',        dto.domicilio ?? null);
    if (dto.contactos       !== undefined) set('contactos',        JSON.stringify(dto.contactos));

    if (fields.length === 0) {
      return (await this.findById(id, institucionId)) as Alumno;
    }

    params.push(id, institucionId);
    const { rows } = await this.pool.query<Alumno>(
      `UPDATE alumnos SET ${fields.join(', ')}
       WHERE id = $${idx++} AND institucion_id = $${idx}
       RETURNING *`,
      params,
    );
    return rows[0];
  }

  async darDeBaja(
    id: string,
    institucionId: string,
    motivo: string,
    fechaBaja: string,
  ): Promise<Alumno> {
    const { rows } = await this.pool.query<Alumno>(
      `UPDATE alumnos
       SET estado = 'baja', motivo_baja = $1, fecha_baja = $2
       WHERE id = $3 AND institucion_id = $4
       RETURNING *`,
      [motivo, fechaBaja, id, institucionId],
    );
    return rows[0];
  }

  // ─── HISTORIAL ────────────────────────────────────────────

  async getHistorial(alumnoId: string): Promise<HistorialEntry[]> {
    const { rows } = await this.pool.query<HistorialEntry>(
      `SELECT id, usuario_id, accion, payload_before, payload_after, created_at
       FROM audit_log
       WHERE tabla = 'alumnos' AND registro_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [alumnoId],
    );
    return rows;
  }

  // ─── RIESGO ACADÉMICO ─────────────────────────────────────

  async findEnRiesgo(institucion_id: string, ciclo: number): Promise<AlumnoEnRiesgo[]> {
    const { rows } = await this.pool.query<AlumnoEnRiesgo>(
      `SELECT
         a.id,
         a.nombre,
         a.apellido,
         a.numero_legajo,
         i.estado        AS estado_inscripcion,
         c.nombre        AS curso_nombre,
         ROUND(AVG(cal.nota_numerica)::numeric, 2)                                          AS promedio_general,
         COUNT(DISTINCT ac.materia_id)
           FILTER (WHERE cal.nota_numerica IS NOT NULL AND cal.nota_numerica < 6)::int       AS materias_en_riesgo,
         COUNT(DISTINCT ac.materia_id)
           FILTER (WHERE cal.nota_numerica IS NOT NULL)::int                                 AS materias_con_notas
       FROM alumnos a
       JOIN inscripciones i ON i.alumno_id = a.id
                            AND i.ciclo_lectivo = $2
                            AND i.estado IN ('regular','libre')
       JOIN cursos c ON c.id = i.curso_id
       LEFT JOIN actas ac ON ac.curso_id = i.curso_id
                          AND ac.anio_academico = $2
                          AND ac.institucion_id = $1
       LEFT JOIN calificaciones cal ON cal.acta_id = ac.id
                                    AND cal.alumno_id = a.id
                                    AND cal.nota_numerica IS NOT NULL
       WHERE a.institucion_id = $1
         AND a.estado = 'activo'
       GROUP BY a.id, a.nombre, a.apellido, a.numero_legajo,
                i.estado, c.nombre
       HAVING i.estado = 'libre'
           OR AVG(cal.nota_numerica) < 6
       ORDER BY AVG(cal.nota_numerica) ASC NULLS LAST, a.apellido`,
      [institucion_id, ciclo],
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
       VALUES ($1,$2,'alumnos',$3,$4,$5)`,
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
