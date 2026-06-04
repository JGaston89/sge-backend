import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

export interface Tutor {
  id: string;
  nombre: string;
  apellido: string;
  tipo_documento: string;
  numero_documento: string;
  email: string | null;
  telefono: string | null;
  telefono_laboral: string | null;
  domicilio_calle: string | null;
  domicilio_numero: string | null;
  domicilio_piso: string | null;
  domicilio_torre: string | null;
  domicilio_depto: string | null;
  localidad: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  pais: string;
  nacionalidad: string | null;
  observaciones: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TutorConRelacion extends Tutor {
  relacion: string;
  es_contacto_emergencia: boolean;
  es_responsable_economico: boolean;
  vive_con_alumno: boolean;
  orden: number;
  alumno_tutor_id: string;
}

export interface CreateTutorDto {
  nombre: string;
  apellido: string;
  tipo_documento?: string;
  numero_documento: string;
  email?: string;
  telefono?: string;
  telefono_laboral?: string;
  domicilio_calle?: string;
  domicilio_numero?: string;
  domicilio_piso?: string;
  domicilio_torre?: string;
  domicilio_depto?: string;
  localidad?: string;
  provincia?: string;
  codigo_postal?: string;
  pais?: string;
  nacionalidad?: string;
  observaciones?: string;
}

export interface LinkTutorDto {
  relacion: string;
  es_contacto_emergencia?: boolean;
  es_responsable_economico?: boolean;
  vive_con_alumno?: boolean;
  orden?: number;
}

@Injectable()
export class TutoresRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ── Buscar por documento (para evitar duplicados en la UI) ───────────────

  async buscarPorDocumento(tipo: string, numero: string): Promise<Tutor | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tutores WHERE tipo_documento = $1 AND numero_documento = $2`,
      [tipo, numero],
    );
    return rows[0] ?? null;
  }

  async buscarPorNombre(q: string): Promise<Tutor[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tutores
       WHERE apellido ILIKE $1 OR nombre ILIKE $1
          OR (nombre || ' ' || apellido) ILIKE $1
          OR (apellido || ' ' || nombre) ILIKE $1
       ORDER BY apellido, nombre LIMIT 10`,
      [`%${q}%`],
    );
    return rows;
  }

  // ── CRUD de tutor ────────────────────────────────────────────────────────

  async create(dto: CreateTutorDto): Promise<Tutor> {
    const { rows } = await this.pool.query(
      `INSERT INTO tutores
         (nombre, apellido, tipo_documento, numero_documento,
          email, telefono, telefono_laboral,
          domicilio_calle, domicilio_numero, domicilio_piso,
          domicilio_torre, domicilio_depto,
          localidad, provincia, codigo_postal, pais, nacionalidad, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        dto.nombre.trim(),
        dto.apellido.trim(),
        dto.tipo_documento ?? 'DNI',
        dto.numero_documento.trim(),
        dto.email ?? null,
        dto.telefono ?? null,
        dto.telefono_laboral ?? null,
        dto.domicilio_calle   ?? null,
        dto.domicilio_numero  ?? null,
        dto.domicilio_piso    ?? null,
        dto.domicilio_torre   ?? null,
        dto.domicilio_depto   ?? null,
        dto.localidad         ?? null,
        dto.provincia         ?? null,
        dto.codigo_postal     ?? null,
        dto.pais ?? 'Argentina',
        dto.nacionalidad ?? null,
        dto.observaciones ?? null,
      ],
    );
    return rows[0];
  }

  async findById(id: string): Promise<Tutor | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tutores WHERE id = $1`, [id],
    );
    return rows[0] ?? null;
  }

  async update(id: string, dto: Partial<CreateTutorDto>): Promise<Tutor> {
    const fields: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let idx = 1;

    const set = (col: string, val: unknown) => {
      fields.push(`${col} = $${idx++}`);
      params.push(val);
    };

    if (dto.nombre            !== undefined) set('nombre',           dto.nombre!.trim());
    if (dto.apellido          !== undefined) set('apellido',         dto.apellido!.trim());
    if (dto.tipo_documento    !== undefined) set('tipo_documento',   dto.tipo_documento);
    if (dto.numero_documento  !== undefined) set('numero_documento', dto.numero_documento!.trim());
    if (dto.email             !== undefined) set('email',            dto.email ?? null);
    if (dto.telefono          !== undefined) set('telefono',         dto.telefono ?? null);
    if (dto.telefono_laboral  !== undefined) set('telefono_laboral', dto.telefono_laboral ?? null);
    if (dto.domicilio_calle   !== undefined) set('domicilio_calle',  dto.domicilio_calle  ?? null);
    if (dto.domicilio_numero  !== undefined) set('domicilio_numero', dto.domicilio_numero ?? null);
    if (dto.domicilio_piso    !== undefined) set('domicilio_piso',   dto.domicilio_piso   ?? null);
    if (dto.domicilio_torre   !== undefined) set('domicilio_torre',  dto.domicilio_torre  ?? null);
    if (dto.domicilio_depto   !== undefined) set('domicilio_depto',  dto.domicilio_depto  ?? null);
    if (dto.localidad         !== undefined) set('localidad',        dto.localidad        ?? null);
    if (dto.provincia         !== undefined) set('provincia',        dto.provincia        ?? null);
    if (dto.codigo_postal     !== undefined) set('codigo_postal',    dto.codigo_postal    ?? null);
    if (dto.pais              !== undefined) set('pais',             dto.pais);
    if (dto.nacionalidad      !== undefined) set('nacionalidad',     dto.nacionalidad     ?? null);
    if (dto.observaciones     !== undefined) set('observaciones',    dto.observaciones    ?? null);

    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE tutores SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    if (!rows[0]) throw new NotFoundException(`Tutor ${id} no encontrado`);
    return rows[0];
  }

  // ── Relación alumno ↔ tutor ──────────────────────────────────────────────

  async findByAlumno(alumnoId: string): Promise<TutorConRelacion[]> {
    const { rows } = await this.pool.query(
      `SELECT t.*,
              at.id              AS alumno_tutor_id,
              at.relacion,
              at.es_contacto_emergencia,
              at.es_responsable_economico,
              at.vive_con_alumno,
              at.orden
       FROM tutores t
       JOIN alumno_tutores at ON at.tutor_id = t.id
       WHERE at.alumno_id = $1
       ORDER BY at.orden ASC, at.created_at ASC`,
      [alumnoId],
    );
    return rows;
  }

  async link(alumnoId: string, tutorId: string, dto: LinkTutorDto): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO alumno_tutores
           (alumno_id, tutor_id, relacion,
            es_contacto_emergencia, es_responsable_economico, vive_con_alumno, orden)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          alumnoId, tutorId,
          dto.relacion,
          dto.es_contacto_emergencia  ?? false,
          dto.es_responsable_economico ?? false,
          dto.vive_con_alumno         ?? false,
          dto.orden                   ?? 1,
        ],
      );
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('Este tutor ya está vinculado al alumno');
      }
      throw err;
    }
  }

  async updateRelacion(alumnoId: string, tutorId: string, dto: Partial<LinkTutorDto>): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const set = (col: string, val: unknown) => { fields.push(`${col} = $${idx++}`); params.push(val); };

    if (dto.relacion                  !== undefined) set('relacion',                  dto.relacion);
    if (dto.es_contacto_emergencia    !== undefined) set('es_contacto_emergencia',    dto.es_contacto_emergencia);
    if (dto.es_responsable_economico  !== undefined) set('es_responsable_economico',  dto.es_responsable_economico);
    if (dto.vive_con_alumno           !== undefined) set('vive_con_alumno',           dto.vive_con_alumno);
    if (dto.orden                     !== undefined) set('orden',                     dto.orden);

    if (fields.length === 0) return;

    params.push(alumnoId, tutorId);
    await this.pool.query(
      `UPDATE alumno_tutores SET ${fields.join(', ')}
       WHERE alumno_id = $${idx++} AND tutor_id = $${idx}`,
      params,
    );
  }

  async unlink(alumnoId: string, tutorId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM alumno_tutores WHERE alumno_id = $1 AND tutor_id = $2`,
      [alumnoId, tutorId],
    );
  }
}
