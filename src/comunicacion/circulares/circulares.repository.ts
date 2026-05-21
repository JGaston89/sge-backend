import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../database/database.module';
import type { CreateCircularDto, UpdateCircularDto } from './dto/circular.dto';

@Injectable()
export class CircularesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  private tiposVisibles(roles: string[]): string[] {
    const tipos = new Set(['todos']);
    if (roles.includes('alumno'))
      tipos.add('alumnos');
    if (roles.includes('docente'))
      tipos.add('docentes'), tipos.add('docentes_y_administrativos');
    if (roles.some(r => ['admin', 'directivo', 'administrativo'].includes(r)))
      tipos.add('administrativos'), tipos.add('docentes_y_administrativos');
    return [...tipos];
  }

  async findAll(institucionId: string, userId: string, roles: string[]) {
    const tipos = this.tiposVisibles(roles);
    const ph    = tipos.map((_, i) => `$${i + 3}`).join(',');

    const { rows } = await this.pool.query(
      `SELECT c.*,
         COALESCE(u.nombre || ' ' || u.apellido, 'Sistema') AS creado_por_nombre,
         (cv.usuario_id IS NOT NULL)                         AS visto
       FROM circulares c
       LEFT JOIN usuarios u
         ON u.id = c.created_by
       LEFT JOIN circulares_vistas cv
         ON cv.circular_id = c.id AND cv.usuario_id = $2
       WHERE c.institucion_id = $1
         AND c.destinatarios_tipo IN (${ph})
       ORDER BY c.fecha_publicacion DESC, c.created_at DESC`,
      [institucionId, userId, ...tipos],
    );
    return rows;
  }

  async findById(id: string, institucionId: string, userId: string) {
    const { rows: [c] } = await this.pool.query(
      `SELECT c.*,
         COALESCE(u.nombre || ' ' || u.apellido, 'Sistema') AS creado_por_nombre,
         (cv.usuario_id IS NOT NULL)                         AS visto
       FROM circulares c
       LEFT JOIN usuarios u
         ON u.id = c.created_by
       LEFT JOIN circulares_vistas cv
         ON cv.circular_id = c.id AND cv.usuario_id = $2
       WHERE c.id = $1 AND c.institucion_id = $3`,
      [id, userId, institucionId],
    );
    return c ?? null;
  }

  async marcarLeida(circularId: string, userId: string) {
    await this.pool.query(
      `INSERT INTO circulares_vistas (circular_id, usuario_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [circularId, userId],
    );
  }

  async create(institucionId: string, dto: CreateCircularDto, createdBy: string) {
    const { rows: [c] } = await this.pool.query(
      `INSERT INTO circulares
         (institucion_id, titulo, contenido, tipo, destinatarios_tipo,
          fecha_publicacion, fecha_vencimiento, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        institucionId, dto.titulo, dto.contenido,
        dto.tipo, dto.destinatarios_tipo,
        dto.fecha_publicacion, dto.fecha_vencimiento ?? null,
        createdBy,
      ],
    );
    return c;
  }

  async update(id: string, institucionId: string, dto: UpdateCircularDto) {
    const sets: string[]   = ['updated_at = NOW()'];
    const params: unknown[] = [id, institucionId];
    let idx = 3;

    if (dto.titulo             !== undefined) { sets.push(`titulo = $${idx++}`);             params.push(dto.titulo); }
    if (dto.contenido          !== undefined) { sets.push(`contenido = $${idx++}`);           params.push(dto.contenido); }
    if (dto.tipo               !== undefined) { sets.push(`tipo = $${idx++}`);                params.push(dto.tipo); }
    if (dto.destinatarios_tipo !== undefined) { sets.push(`destinatarios_tipo = $${idx++}`);  params.push(dto.destinatarios_tipo); }
    if (dto.fecha_publicacion  !== undefined) { sets.push(`fecha_publicacion = $${idx++}`);   params.push(dto.fecha_publicacion); }
    if (dto.fecha_vencimiento  !== undefined) { sets.push(`fecha_vencimiento = $${idx++}`);   params.push(dto.fecha_vencimiento ?? null); }

    const { rows: [c] } = await this.pool.query(
      `UPDATE circulares SET ${sets.join(', ')}
       WHERE id = $1 AND institucion_id = $2 RETURNING *`,
      params,
    );
    return c ?? null;
  }

  async delete(id: string, institucionId: string) {
    const { rowCount } = await this.pool.query(
      `DELETE FROM circulares WHERE id = $1 AND institucion_id = $2`,
      [id, institucionId],
    );
    return (rowCount ?? 0) > 0;
  }
}
