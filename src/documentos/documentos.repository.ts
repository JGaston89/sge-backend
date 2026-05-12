import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

export interface DocumentoRow {
  id: string;
  institucion_id: string;
  alumno_id: string;
  tipo_documento: string;
  nombre_archivo: string;
  s3_key: string;
  s3_bucket: string;
  mime_type: string;
  tamano_bytes: number;
  version: number;
  subido_por: string;
  activo: boolean;
  created_at: Date;
  deleted_at: Date | null;
  deleted_by: string | null;
  subido_por_nombre: string;
}

export interface CreateDocumentoData {
  institucion_id: string;
  alumno_id: string;
  tipo_documento: string;
  nombre_archivo: string;
  s3_key: string;
  s3_bucket: string;
  mime_type: string;
  tamano_bytes: number;
  version: number;
  subido_por: string;
}

@Injectable()
export class DocumentosRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAlumno(alumnoId: string, institucionId: string): Promise<DocumentoRow[]> {
    const { rows } = await this.pool.query<DocumentoRow>(
      `SELECT d.*, u.nombre || ' ' || u.apellido AS subido_por_nombre
       FROM alumno_documentos d
       JOIN usuarios u ON u.id = d.subido_por
       WHERE d.alumno_id = $1 AND d.institucion_id = $2 AND d.activo = TRUE
       ORDER BY d.tipo_documento, d.version DESC, d.created_at DESC`,
      [alumnoId, institucionId],
    );
    return rows;
  }

  async findById(id: string, institucionId: string): Promise<DocumentoRow | null> {
    const { rows } = await this.pool.query<DocumentoRow>(
      `SELECT d.*, u.nombre || ' ' || u.apellido AS subido_por_nombre
       FROM alumno_documentos d
       JOIN usuarios u ON u.id = d.subido_por
       WHERE d.id = $1 AND d.institucion_id = $2`,
      [id, institucionId],
    );
    return rows[0] ?? null;
  }

  async getLastVersion(alumnoId: string, tipoDocumento: string): Promise<number> {
    const { rows } = await this.pool.query<{ max: string | null }>(
      `SELECT MAX(version) AS max
       FROM alumno_documentos
       WHERE alumno_id = $1 AND tipo_documento = $2`,
      [alumnoId, tipoDocumento],
    );
    return rows[0]?.max ? Number(rows[0].max) : 0;
  }

  async create(data: CreateDocumentoData): Promise<DocumentoRow> {
    const { rows } = await this.pool.query<DocumentoRow>(
      `INSERT INTO alumno_documentos
         (institucion_id, alumno_id, tipo_documento, nombre_archivo,
          s3_key, s3_bucket, mime_type, tamano_bytes, version, subido_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        data.institucion_id,
        data.alumno_id,
        data.tipo_documento,
        data.nombre_archivo,
        data.s3_key,
        data.s3_bucket,
        data.mime_type,
        data.tamano_bytes,
        data.version,
        data.subido_por,
      ],
    );
    return rows[0];
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.pool.query(
      `UPDATE alumno_documentos
       SET activo = FALSE, deleted_at = NOW(), deleted_by = $2
       WHERE id = $1`,
      [id, deletedBy],
    );
  }
}
