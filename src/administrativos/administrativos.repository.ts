import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { AccesoEstado } from '../common/enums/acceso-estado.enum';
import type { CreateAdministrativoDto, UpdateAdministrativoDto } from './dto/administrativos.dto';

export interface StaffAdministrativo {
  id: string;
  institucion_id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  nacionalidad: string | null;
  domicilio_calle: string | null;
  domicilio_numero: string | null;
  domicilio_piso: string | null;
  domicilio_torre: string | null;
  domicilio_depto: string | null;
  localidad: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  cargo: string | null;
  fecha_ingreso: string | null;
  estado: 'activo' | 'inactivo';
  observaciones: string | null;
  created_at: Date;
  updated_at: Date;
  acceso_estado: AccesoEstado;
  ultimo_envio_activacion: Date | null;
  ultimo_acceso: Date | null;
}

@Injectable()
export class AdministrativosRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findAll(
    institucion_id: string,
    filters: { estado?: string; search?: string },
  ): Promise<StaffAdministrativo[]> {
    const conditions: string[] = ['sa.institucion_id = $1'];
    const params: unknown[] = [institucion_id];
    let idx = 2;

    if (filters.estado) {
      conditions.push(`sa.estado = $${idx++}`);
      params.push(filters.estado);
    }
    if (filters.search) {
      conditions.push(
        `(sa.nombre ILIKE $${idx} OR sa.apellido ILIKE $${idx} OR sa.dni ILIKE $${idx} OR sa.cargo ILIKE $${idx})`,
      );
      params.push(`%${filters.search}%`);
      idx++;
    }

    const { rows } = await this.pool.query<StaffAdministrativo>(
      `SELECT sa.*,
              u.nombre || ' ' || u.apellido AS usuario_nombre,
              u.ultimo_acceso,
              u.ultimo_envio_activacion,
              CASE
                WHEN sa.usuario_id IS NULL      THEN 'SIN_CUENTA'
                WHEN u.cuenta_activada = false  THEN 'PENDIENTE'
                ELSE                                 'ACTIVADO'
              END AS acceso_estado
         FROM staff_administrativo sa
    LEFT JOIN usuarios u ON u.id = sa.usuario_id
        WHERE ${conditions.join(' AND ')}
     ORDER BY sa.apellido, sa.nombre`,
      params,
    );
    return rows;
  }

  async findOne(id: string, institucion_id: string): Promise<StaffAdministrativo> {
    const { rows } = await this.pool.query<StaffAdministrativo>(
      `SELECT sa.*,
              u.nombre || ' ' || u.apellido AS usuario_nombre,
              u.ultimo_acceso,
              u.ultimo_envio_activacion,
              CASE
                WHEN sa.usuario_id IS NULL      THEN 'SIN_CUENTA'
                WHEN u.cuenta_activada = false  THEN 'PENDIENTE'
                ELSE                                 'ACTIVADO'
              END AS acceso_estado
         FROM staff_administrativo sa
    LEFT JOIN usuarios u ON u.id = sa.usuario_id
        WHERE sa.id = $1 AND sa.institucion_id = $2`,
      [id, institucion_id],
    );
    if (!rows[0]) throw new NotFoundException('Administrativo no encontrado');
    return rows[0];
  }

  async create(institucion_id: string, dto: CreateAdministrativoDto): Promise<StaffAdministrativo> {
    try {
      const { rows } = await this.pool.query<{ id: string }>(
        `INSERT INTO staff_administrativo
           (institucion_id, nombre, apellido, dni, email, telefono,
            fecha_nacimiento, genero, nacionalidad,
            domicilio_calle, domicilio_numero, domicilio_piso,
            domicilio_torre, domicilio_depto,
            localidad, provincia, codigo_postal,
            cargo, fecha_ingreso, observaciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING id`,
        [
          institucion_id,
          dto.nombre,
          dto.apellido,
          dto.dni          ?? null,
          dto.email        ?? null,
          dto.telefono     ?? null,
          dto.fecha_nacimiento ?? null,
          dto.genero       ?? null,
          dto.nacionalidad ?? null,
          dto.domicilio_calle   ?? null,
          dto.domicilio_numero  ?? null,
          dto.domicilio_piso    ?? null,
          dto.domicilio_torre   ?? null,
          dto.domicilio_depto   ?? null,
          dto.localidad         ?? null,
          dto.provincia         ?? null,
          dto.codigo_postal     ?? null,
          dto.cargo        ?? null,
          dto.fecha_ingreso ?? null,
          dto.observaciones ?? null,
        ],
      );
      return this.findOne(rows[0].id, institucion_id);
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException('Ya existe un administrativo con ese DNI');
      throw err;
    }
  }

  async update(id: string, institucion_id: string, dto: UpdateAdministrativoDto): Promise<StaffAdministrativo> {
    const fields: (keyof UpdateAdministrativoDto)[] = [
      'nombre', 'apellido', 'dni', 'email', 'telefono',
      'fecha_nacimiento', 'genero', 'nacionalidad',
      'domicilio_calle', 'domicilio_numero', 'domicilio_piso',
      'domicilio_torre', 'domicilio_depto',
      'localidad', 'provincia', 'codigo_postal',
      'cargo', 'fecha_ingreso', 'estado', 'observaciones',
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
    if (!sets.length) return this.findOne(id, institucion_id);

    params.push(id, institucion_id);
    await this.pool.query(
      `UPDATE staff_administrativo SET ${sets.join(', ')}
        WHERE id = $${idx++} AND institucion_id = $${idx++}`,
      params,
    );
    return this.findOne(id, institucion_id);
  }

  async remove(id: string, institucion_id: string): Promise<void> {
    const staff = await this.findOne(id, institucion_id);
    if (staff.usuario_id) {
      throw new ConflictException('No se puede eliminar un administrativo que ya tiene cuenta de usuario. Desactivalo primero.');
    }
    const { rowCount } = await this.pool.query(
      `DELETE FROM staff_administrativo WHERE id = $1 AND institucion_id = $2`,
      [id, institucion_id],
    );
    if (!rowCount) throw new NotFoundException('Administrativo no encontrado');
  }
}
