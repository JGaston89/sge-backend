import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import type { CreateNoticiaDto, UpdateNoticiaDto, QueryNoticiasDto, UpdatePerfilInstitucionDto } from './dto/portal.dto';

function toSlug(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 300);
}

@Injectable()
export class PortalRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ── Perfil público ────────────────────────────────────────────────

  async getPerfilPublico(institucionId: string) {
    const { rows } = await this.pool.query(
      `SELECT id, nombre, tipo, domicilio,
              logo_url, banner_url, motto, descripcion,
              email_contacto, telefono_contacto, sitio_web,
              color_primario, color_secundario, redes_sociales
       FROM instituciones WHERE id = $1 AND activo = true`,
      [institucionId],
    );
    return rows[0] ?? null;
  }

  async updatePerfil(institucionId: string, dto: UpdatePerfilInstitucionDto) {
    const fields = Object.entries(dto)
      .filter(([, v]) => v !== undefined)
      .map(([k], i) => `${k} = $${i + 2}`);

    if (fields.length === 0) return this.getPerfilPublico(institucionId);

    const values = Object.entries(dto)
      .filter(([, v]) => v !== undefined)
      .map(([, v]) => v);

    const { rows } = await this.pool.query(
      `UPDATE instituciones SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [institucionId, ...values],
    );
    return rows[0];
  }

  // ── Noticias — lectura pública ────────────────────────────────────

  async findNoticias(institucionId: string, query: QueryNoticiasDto) {
    const conditions: string[] = ['n.institucion_id = $1', 'n.publicada = true'];
    const params: unknown[] = [institucionId];
    let idx = 2;

    if (query.categoria) {
      conditions.push(`n.categoria = $${idx++}`);
      params.push(query.categoria);
    }
    if (query.destacada !== undefined) {
      conditions.push(`n.destacada = $${idx++}`);
      params.push(query.destacada);
    }
    if (query.q) {
      conditions.push(`(n.titulo ILIKE $${idx} OR n.resumen ILIKE $${idx})`);
      params.push(`%${query.q}%`);
      idx++;
    }

    const { rows } = await this.pool.query(
      `SELECT n.id, n.titulo, n.slug, n.resumen, n.imagen_url, n.categoria,
              n.destacada, n.publicado_en,
              u.nombre AS autor_nombre, u.apellido AS autor_apellido
       FROM noticias n
       LEFT JOIN usuarios u ON u.id = n.autor_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY n.destacada DESC, n.publicado_en DESC
       LIMIT 50`,
      params,
    );
    return rows;
  }

  async findNoticiaBySlug(institucionId: string, slug: string) {
    const { rows } = await this.pool.query(
      `SELECT n.id, n.titulo, n.slug, n.resumen, n.contenido,
              n.imagen_url, n.archivos, n.categoria,
              n.destacada, n.publicada, n.publicado_en,
              n.created_at, n.updated_at,
              u.nombre AS autor_nombre, u.apellido AS autor_apellido
       FROM noticias n
       LEFT JOIN usuarios u ON u.id = n.autor_id
       WHERE n.institucion_id = $1 AND n.slug = $2 AND n.publicada = true`,
      [institucionId, slug],
    );
    return rows[0] ?? null;
  }

  // ── Noticias — admin ──────────────────────────────────────────────

  async findNoticiasAdmin(institucionId: string) {
    const { rows } = await this.pool.query(
      `SELECT n.id, n.titulo, n.slug, n.categoria, n.destacada, n.publicada,
              n.publicado_en, n.created_at,
              u.nombre AS autor_nombre, u.apellido AS autor_apellido
       FROM noticias n
       LEFT JOIN usuarios u ON u.id = n.autor_id
       WHERE n.institucion_id = $1
       ORDER BY n.created_at DESC`,
      [institucionId],
    );
    return rows;
  }

  async findNoticiaById(id: string, institucionId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM noticias WHERE id = $1 AND institucion_id = $2`,
      [id, institucionId],
    );
    return rows[0] ?? null;
  }

  async createNoticia(institucionId: string, autorId: string, dto: CreateNoticiaDto) {
    const baseSlug = toSlug(dto.titulo);
    const { rows: existing } = await this.pool.query(
      `SELECT slug FROM noticias WHERE institucion_id = $1 AND slug LIKE $2`,
      [institucionId, `${baseSlug}%`],
    );
    const slugs = new Set(existing.map((r: any) => r.slug));
    let slug = baseSlug;
    let counter = 1;
    while (slugs.has(slug)) slug = `${baseSlug}-${counter++}`;

    const publicadoEn = dto.publicada ? new Date() : null;

    const { rows } = await this.pool.query(
      `INSERT INTO noticias
         (institucion_id, autor_id, titulo, slug, resumen, contenido,
          imagen_url, categoria, destacada, publicada, publicado_en, archivos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        institucionId, autorId, dto.titulo, slug,
        dto.resumen ?? null, dto.contenido,
        dto.imagen_url ?? null,
        dto.categoria ?? 'general',
        dto.destacada ?? false,
        dto.publicada ?? false,
        publicadoEn,
        JSON.stringify(dto.archivos ?? []),
      ],
    );
    return rows[0];
  }

  async updateNoticia(id: string, institucionId: string, dto: UpdateNoticiaDto) {
    const noticia = await this.findNoticiaById(id, institucionId);
    if (!noticia) throw new NotFoundException(`Noticia ${id} no encontrada`);

    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [id, institucionId];
    let idx = 3;

    const fieldMap: Record<string, string> = {
      titulo: 'titulo', resumen: 'resumen', contenido: 'contenido',
      imagen_url: 'imagen_url', categoria: 'categoria',
      destacada: 'destacada', publicada: 'publicada',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((dto as any)[key] !== undefined) {
        setClauses.push(`${col} = $${idx++}`);
        params.push((dto as any)[key]);
      }
    }

    if (dto.archivos !== undefined) {
      setClauses.push(`archivos = $${idx++}`);
      params.push(JSON.stringify(dto.archivos));
    }

    if (dto.publicada && !noticia.publicada) {
      setClauses.push(`publicado_en = $${idx++}`);
      params.push(new Date());
    }

    const { rows } = await this.pool.query(
      `UPDATE noticias SET ${setClauses.join(', ')} WHERE id = $1 AND institucion_id = $2 RETURNING *`,
      params,
    );
    return rows[0];
  }

  async deleteNoticia(id: string, institucionId: string) {
    const noticia = await this.findNoticiaById(id, institucionId);
    if (!noticia) throw new NotFoundException(`Noticia ${id} no encontrada`);
    await this.pool.query(`DELETE FROM noticias WHERE id = $1`, [id]);
    return { deleted: true };
  }
}
