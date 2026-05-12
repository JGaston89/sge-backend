import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import type { CreateCicloDto, CreateEventoDto } from './dto/calendario.dto';

@Injectable()
export class CalendarioRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ─── Ciclos lectivos ─────────────────────────────────────────

  async createCiclo(institucionId: string, dto: CreateCicloDto) {
    const { rows } = await this.pool.query(
      `INSERT INTO ciclos_lectivos
         (institucion_id, nombre, anio, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [institucionId, dto.nombre, dto.anio, dto.fecha_inicio, dto.fecha_fin],
    );
    return rows[0];
  }

  async findCiclos(institucionId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ciclos_lectivos
       WHERE institucion_id = $1
       ORDER BY anio DESC`,
      [institucionId],
    );
    return rows;
  }

  async findCicloActivo(institucionId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ciclos_lectivos
       WHERE institucion_id = $1
         AND fecha_inicio <= CURRENT_DATE
         AND fecha_fin    >= CURRENT_DATE
       ORDER BY anio DESC
       LIMIT 1`,
      [institucionId],
    );
    return rows[0] ?? null;
  }

  async findCicloById(id: string, institucionId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM ciclos_lectivos WHERE id = $1 AND institucion_id = $2`,
      [id, institucionId],
    );
    return rows[0] ?? null;
  }

  // ─── Eventos ─────────────────────────────────────────────────

  async createEvento(institucionId: string, dto: CreateEventoDto, createdBy: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO calendario_eventos
         (institucion_id, ciclo_id, titulo, descripcion, tipo,
          fecha_inicio, fecha_fin, todo_el_dia, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        institucionId,
        dto.ciclo_id ?? null,
        dto.titulo,
        dto.descripcion ?? null,
        dto.tipo,
        dto.fecha_inicio,
        dto.fecha_fin ?? null,
        dto.todo_el_dia ?? true,
        createdBy,
      ],
    );
    return rows[0];
  }

  async findEventos(
    institucionId: string,
    opts: { desde?: string; hasta?: string; tipo?: string },
  ) {
    const conditions: string[] = ['e.institucion_id = $1'];
    const params: unknown[]    = [institucionId];
    let idx = 2;

    if (opts.desde) {
      conditions.push(`e.fecha_inicio >= $${idx++}`);
      params.push(opts.desde);
    }
    if (opts.hasta) {
      conditions.push(
        `(e.fecha_fin <= $${idx} OR (e.fecha_fin IS NULL AND e.fecha_inicio <= $${idx}))`,
      );
      params.push(opts.hasta);
      idx++;
    }
    if (opts.tipo) {
      conditions.push(`e.tipo = $${idx++}`);
      params.push(opts.tipo);
    }

    const { rows } = await this.pool.query(
      `SELECT e.*, cl.nombre AS ciclo_nombre
       FROM calendario_eventos e
       LEFT JOIN ciclos_lectivos cl ON cl.id = e.ciclo_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.fecha_inicio ASC`,
      params,
    );
    return rows;
  }

  async findEventosParaIcal(institucionId: string) {
    const { rows } = await this.pool.query(
      `SELECT titulo, descripcion, tipo, fecha_inicio, fecha_fin, todo_el_dia
       FROM calendario_eventos
       WHERE institucion_id = $1
       ORDER BY fecha_inicio ASC`,
      [institucionId],
    );
    return rows;
  }

  async bulkInsertFeriados(
    institucionId: string,
    cicloId: string | null,
    feriados: Array<{ fecha: string; titulo: string; descripcion: string }>,
    createdBy: string,
  ) {
    if (feriados.length === 0) return [];

    const values = feriados
      .map((_, i) => {
        const b = i * 7;
        return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7})`;
      })
      .join(', ');

    const params: unknown[] = [];
    for (const f of feriados) {
      params.push(
        institucionId, cicloId, f.titulo, f.descripcion,
        'feriado_nacional', f.fecha, createdBy,
      );
    }

    const { rows } = await this.pool.query(
      `INSERT INTO calendario_eventos
         (institucion_id, ciclo_id, titulo, descripcion, tipo, fecha_inicio, created_by)
       VALUES ${values}
       ON CONFLICT DO NOTHING
       RETURNING id, titulo, fecha_inicio`,
      params,
    );
    return rows;
  }
}
