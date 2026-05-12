import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { CreateMaterialEstudioDto, UpdateMaterialEstudioDto } from './dto/biblioteca.dto';

export interface MaterialEstudio {
  id: string;
  titulo: string;
  docente_id: string | null;
  docente_nombre: string | null;
  curso_id: string | null;
  curso_nombre: string | null;
  materia_id: string | null;
  materia_nombre: string | null;
  temas: string | null;
  descripcion: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archivos: ArchivoEstudio[];
}

export interface ArchivoEstudio {
  id: string;
  material_id: string;
  nombre_original: string;
  titulo_archivo: string | null;
  s3_key: string;
  s3_bucket: string;
  mime_type: string;
  tamano_bytes: number | null;
  created_at: string;
}

@Injectable()
export class BibliotecaRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findMateriales(opts: {
    search?: string;
    docente_id?: string;
    curso_id?: string;
    materia_id?: string;
    page: number;
    limit: number;
  }): Promise<{ items: MaterialEstudio[]; total: number }> {
    const { search, docente_id, curso_id, materia_id, page, limit } = opts;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const wheres: string[] = [];

    if (search) {
      params.push(`%${search}%`);
      wheres.push(`(m.titulo ILIKE $${params.length} OR m.temas ILIKE $${params.length})`);
    }
    if (docente_id) { params.push(docente_id); wheres.push(`m.docente_id = $${params.length}`); }
    if (curso_id)   { params.push(curso_id);   wheres.push(`m.curso_id = $${params.length}`);   }
    if (materia_id) { params.push(materia_id); wheres.push(`m.materia_id = $${params.length}`); }

    const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM biblioteca_materiales_estudio m
      ${where}
    `;
    const { rows: [{ total }] } = await this.pool.query(countSql, params);

    params.push(limit, offset);
    const sql = `
      SELECT
        m.id, m.titulo, m.temas, m.descripcion, m.created_by, m.created_at, m.updated_at,
        m.docente_id,
        CONCAT(ld.nombre, ' ', ld.apellido) AS docente_nombre,
        m.curso_id, c.nombre AS curso_nombre,
        m.materia_id, mt.nombre AS materia_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id',              a.id,
              'material_id',     a.material_id,
              'nombre_original', a.nombre_original,
              'titulo_archivo',  a.titulo_archivo,
              's3_key',          a.s3_key,
              's3_bucket',       a.s3_bucket,
              'mime_type',       a.mime_type,
              'tamano_bytes',    a.tamano_bytes,
              'created_at',      a.created_at
            ) ORDER BY a.created_at
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) AS archivos
      FROM biblioteca_materiales_estudio m
      LEFT JOIN legajos_docentes ld ON ld.id = m.docente_id
      LEFT JOIN cursos c            ON c.id  = m.curso_id
      LEFT JOIN materias mt         ON mt.id = m.materia_id
      LEFT JOIN biblioteca_archivos a ON a.material_id = m.id
      ${where}
      GROUP BY m.id, ld.nombre, ld.apellido, c.nombre, mt.nombre
      ORDER BY m.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await this.pool.query(sql, params);
    return { items: rows as MaterialEstudio[], total: Number(total) };
  }

  async findById(id: string): Promise<MaterialEstudio | null> {
    const sql = `
      SELECT
        m.id, m.titulo, m.temas, m.descripcion, m.created_by, m.created_at, m.updated_at,
        m.docente_id,
        CONCAT(ld.nombre, ' ', ld.apellido) AS docente_nombre,
        m.curso_id, c.nombre AS curso_nombre,
        m.materia_id, mt.nombre AS materia_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id',              a.id,
              'material_id',     a.material_id,
              'nombre_original', a.nombre_original,
              'titulo_archivo',  a.titulo_archivo,
              's3_key',          a.s3_key,
              's3_bucket',       a.s3_bucket,
              'mime_type',       a.mime_type,
              'tamano_bytes',    a.tamano_bytes,
              'created_at',      a.created_at
            ) ORDER BY a.created_at
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) AS archivos
      FROM biblioteca_materiales_estudio m
      LEFT JOIN legajos_docentes ld ON ld.id = m.docente_id
      LEFT JOIN cursos c            ON c.id  = m.curso_id
      LEFT JOIN materias mt         ON mt.id = m.materia_id
      LEFT JOIN biblioteca_archivos a ON a.material_id = m.id
      WHERE m.id = $1
      GROUP BY m.id, ld.nombre, ld.apellido, c.nombre, mt.nombre
    `;
    const { rows } = await this.pool.query(sql, [id]);
    return rows[0] as MaterialEstudio ?? null;
  }

  async createMaterial(dto: CreateMaterialEstudioDto, userId: string): Promise<MaterialEstudio> {
    const sql = `
      INSERT INTO biblioteca_materiales_estudio
        (titulo, docente_id, curso_id, materia_id, temas, descripcion, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const { rows } = await this.pool.query(sql, [
      dto.titulo,
      dto.docente_id   ?? null,
      dto.curso_id     ?? null,
      dto.materia_id   ?? null,
      dto.temas        ?? null,
      dto.descripcion  ?? null,
      userId,
    ]);
    return this.findById(rows[0].id) as Promise<MaterialEstudio>;
  }

  async updateMaterial(id: string, dto: UpdateMaterialEstudioDto): Promise<MaterialEstudio | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (dto.titulo !== undefined)      { params.push(dto.titulo);      sets.push(`titulo = $${params.length}`); }
    if (dto.docente_id !== undefined)  { params.push(dto.docente_id);  sets.push(`docente_id = $${params.length}`); }
    if (dto.curso_id !== undefined)    { params.push(dto.curso_id);    sets.push(`curso_id = $${params.length}`); }
    if (dto.materia_id !== undefined)  { params.push(dto.materia_id);  sets.push(`materia_id = $${params.length}`); }
    if (dto.temas !== undefined)       { params.push(dto.temas);       sets.push(`temas = $${params.length}`); }
    if (dto.descripcion !== undefined) { params.push(dto.descripcion); sets.push(`descripcion = $${params.length}`); }

    if (!sets.length) return this.findById(id);
    sets.push(`updated_at = NOW()`);
    params.push(id);

    await this.pool.query(
      `UPDATE biblioteca_materiales_estudio SET ${sets.join(', ')} WHERE id = $${params.length}`,
      params,
    );
    return this.findById(id);
  }

  async deleteMaterial(id: string): Promise<void> {
    await this.pool.query('DELETE FROM biblioteca_materiales_estudio WHERE id = $1', [id]);
  }

  async createArchivo(data: {
    material_id: string;
    nombre_original: string;
    titulo_archivo?: string;
    s3_key: string;
    s3_bucket: string;
    mime_type: string;
    tamano_bytes: number;
    userId: string;
  }): Promise<ArchivoEstudio> {
    const sql = `
      INSERT INTO biblioteca_archivos
        (material_id, nombre_original, titulo_archivo, s3_key, s3_bucket, mime_type, tamano_bytes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const { rows } = await this.pool.query(sql, [
      data.material_id,
      data.nombre_original,
      data.titulo_archivo ?? null,
      data.s3_key,
      data.s3_bucket,
      data.mime_type,
      data.tamano_bytes,
      data.userId,
    ]);
    return rows[0] as ArchivoEstudio;
  }

  async findArchivo(id: string): Promise<ArchivoEstudio | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM biblioteca_archivos WHERE id = $1',
      [id],
    );
    return rows[0] as ArchivoEstudio ?? null;
  }

  async deleteArchivo(id: string): Promise<void> {
    await this.pool.query('DELETE FROM biblioteca_archivos WHERE id = $1', [id]);
  }

  async getArchivosByMaterial(materialId: string): Promise<ArchivoEstudio[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM biblioteca_archivos WHERE material_id = $1 ORDER BY created_at',
      [materialId],
    );
    return rows as ArchivoEstudio[];
  }
}
