import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import type {
  CreateEspacioDto, CreateReservaEspacioDto,
  CreateMantenimientoDto, UpdateMantenimientoDto,
} from './dto/espacios.dto';

@Injectable()
export class EspaciosRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ─── Espacios ─────────────────────────────────────────────────

  async createEspacio(institucionId: string, dto: CreateEspacioDto, createdBy: string) {
    const { rows: [e] } = await this.pool.query(
      `INSERT INTO espacios
         (institucion_id, nombre, tipo, capacidad, equipamiento, piso, descripcion, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        institucionId, dto.nombre, dto.tipo, dto.capacidad ?? null,
        JSON.stringify(dto.equipamiento ?? []),
        dto.piso ?? null, dto.descripcion ?? null, createdBy,
      ],
    );
    return e;
  }

  async findEspacios(institucionId: string, tipo?: string) {
    const conds = ['institucion_id = $1'];
    const params: unknown[] = [institucionId];
    if (tipo) { conds.push(`tipo = $2`); params.push(tipo); }

    const { rows } = await this.pool.query(
      `SELECT * FROM espacios WHERE ${conds.join(' AND ')} ORDER BY nombre`,
      params,
    );
    return rows;
  }

  async updateEstado(id: string, institucionId: string, estado: string) {
    const { rows: [e] } = await this.pool.query(
      `UPDATE espacios SET estado = $3, updated_at = NOW()
       WHERE id = $1 AND institucion_id = $2 RETURNING *`,
      [id, institucionId, estado],
    );
    return e ?? null;
  }

  // ─── Reservas ─────────────────────────────────────────────────

  async checkConflicto(espacioId: string, fecha: string, horaInicio: string, horaFin: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM espacios_reservas
       WHERE espacio_id = $1
         AND fecha = $2
         AND estado = 'confirmada'
         AND hora_inicio < $4
         AND hora_fin > $3
       LIMIT 1`,
      [espacioId, fecha, horaInicio, horaFin],
    );
    return rows.length > 0;
  }

  async createReserva(
    espacioId: string,
    institucionId: string,
    dto: CreateReservaEspacioDto,
    createdBy: string,
  ) {
    const { rows: [r] } = await this.pool.query(
      `INSERT INTO espacios_reservas
         (espacio_id, institucion_id, fecha, hora_inicio, hora_fin,
          nombre_evento, motivo, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        espacioId, institucionId, dto.fecha, dto.hora_inicio, dto.hora_fin,
        dto.nombre_evento ?? null, dto.motivo ?? null, createdBy,
      ],
    );
    return r;
  }

  async findDisponibles(institucionId: string, fecha: string, horaInicio: string, horaFin: string) {
    const { rows } = await this.pool.query(
      `SELECT e.*
       FROM espacios e
       WHERE e.institucion_id = $1
         AND e.estado = 'disponible'
         AND NOT EXISTS (
           SELECT 1 FROM espacios_reservas r
           WHERE r.espacio_id = e.id
             AND r.fecha = $2
             AND r.estado = 'confirmada'
             AND r.hora_inicio < $4
             AND r.hora_fin > $3
         )
       ORDER BY e.nombre`,
      [institucionId, fecha, horaInicio, horaFin],
    );
    return rows;
  }

  async getOcupacion(institucionId: string, semana: string) {
    // semana: 'YYYY-MM-DD' del lunes de la semana
    const { rows } = await this.pool.query(
      `SELECT r.*, e.nombre AS espacio_nombre, e.tipo AS espacio_tipo
       FROM espacios_reservas r
       JOIN espacios e ON e.id = r.espacio_id
       WHERE e.institucion_id = $1
         AND r.estado = 'confirmada'
         AND r.fecha >= $2::date
         AND r.fecha < ($2::date + INTERVAL '7 days')
       ORDER BY r.fecha, r.hora_inicio`,
      [institucionId, semana],
    );
    return rows;
  }

  async findMisReservas(createdBy: string, institucionId: string) {
    const { rows } = await this.pool.query(
      `SELECT r.*, e.nombre AS espacio_nombre, e.tipo AS espacio_tipo, e.capacidad
       FROM espacios_reservas r
       JOIN espacios e ON e.id = r.espacio_id
       WHERE r.created_by = $1 AND e.institucion_id = $2
       ORDER BY r.fecha DESC, r.hora_inicio`,
      [createdBy, institucionId],
    );
    return rows;
  }

  async cancelarReserva(id: string, institucionId: string, userId: string) {
    const { rows: [r] } = await this.pool.query(
      `UPDATE espacios_reservas r
       SET estado = 'cancelada', updated_at = NOW()
       FROM espacios e
       WHERE r.id = $1
         AND e.id = r.espacio_id
         AND e.institucion_id = $2
         AND (r.created_by = $3 OR true)
         AND r.estado = 'confirmada'
       RETURNING r.*`,
      [id, institucionId, userId],
    );
    return r ?? null;
  }

  // ─── Mantenimiento ────────────────────────────────────────────

  async createMantenimiento(institucionId: string, dto: CreateMantenimientoDto, reportedBy: string) {
    const { rows: [m] } = await this.pool.query(
      `INSERT INTO espacios_mantenimiento
         (institucion_id, espacio_id, descripcion_problema, descripcion_equipo,
          prioridad, reported_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        institucionId, dto.espacio_id ?? null, dto.descripcion_problema,
        dto.descripcion_equipo ?? null, dto.prioridad, reportedBy,
      ],
    );
    return m;
  }

  async findMantenimiento(institucionId: string, estado?: string) {
    const conds = ['m.institucion_id = $1'];
    const params: unknown[] = [institucionId];
    if (estado) { conds.push(`m.estado = $2`); params.push(estado); }

    const { rows } = await this.pool.query(
      `SELECT m.*, e.nombre AS espacio_nombre
       FROM espacios_mantenimiento m
       LEFT JOIN espacios e ON e.id = m.espacio_id
       WHERE ${conds.join(' AND ')}
       ORDER BY
         CASE m.prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
         m.created_at DESC`,
      params,
    );
    return rows;
  }

  async updateMantenimiento(id: string, institucionId: string, dto: UpdateMantenimientoDto) {
    const resolvedAt = dto.estado === 'resuelto' ? 'NOW()' : 'resolved_at';
    const { rows: [m] } = await this.pool.query(
      `UPDATE espacios_mantenimiento
       SET estado = $3, updated_at = NOW(),
           resolved_at = ${resolvedAt}
       WHERE id = $1 AND institucion_id = $2
       RETURNING *`,
      [id, institucionId, dto.estado],
    );
    return m ?? null;
  }
}
