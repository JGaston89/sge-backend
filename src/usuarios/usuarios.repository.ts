import * as crypto from 'crypto';
import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { DATABASE_POOL } from '../database/database.module';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type OrigenPersona = 'sistema' | 'docente' | 'alumno' | 'administrativo';

export interface UsuarioRow {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  cuenta_activada: boolean;
  roles: string[];
  ultimo_acceso: Date | null;
  ultimo_envio_activacion: Date | null;
  created_at: Date;
}

export interface PendienteActivacion {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  created_at: Date;
  ultimo_envio_activacion: Date | null;
  activation_token_expires_at: Date | null;
  tipo_entidad: 'alumno' | 'docente' | 'administrativo' | 'sistema';
}

/** Vista unificada: cuentas del sistema + docentes sin cuenta + alumnos sin cuenta */
export interface PersonaUnificada {
  id: string;
  persona_id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  origen: OrigenPersona;
  tiene_cuenta: boolean;
  activo: boolean | null;
  cuenta_activada: boolean;
  roles: string[];
  ultimo_acceso: Date | null;
}

export interface CreateUsuarioData {
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  institucionId: string;
}

export interface CreateFromPersonaData {
  personaId: string;
  origen: OrigenPersona;
  rol: string;
  institucionId: string;
}

export interface UpdateUsuarioData {
  nombre?: string;
  apellido?: string;
  activo?: boolean;
  rol?: string;
}

// ─── Repository ──────────────────────────────────────────────────────────────

@Injectable()
export class UsuariosRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ── Listado unificado ────────────────────────────────────────────────────

  async findAllUnified(institucionId: string): Promise<PersonaUnificada[]> {
    const { rows } = await this.pool.query<PersonaUnificada>(
      `-- Cuentas del sistema
       SELECT
         u.id,
         u.id            AS persona_id,
         u.nombre,
         u.apellido,
         u.email,
         'sistema'::text  AS origen,
         true             AS tiene_cuenta,
         u.activo,
         u.cuenta_activada,
         u.ultimo_acceso,
         COALESCE(
           array_agg(r.nombre ORDER BY r.nombre) FILTER (
             WHERE r.nombre IS NOT NULL
               AND (ur.fecha_hasta IS NULL OR ur.fecha_hasta >= CURRENT_DATE)
           ), '{}'
         ) AS roles
       FROM usuarios u
       LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN roles r ON r.id = ur.rol_id AND r.institucion_id = u.institucion_id
       WHERE u.institucion_id = $1
       GROUP BY u.id

       UNION ALL

       -- Docentes SIN cuenta de usuario
       SELECT
         ld.id            AS id,
         ld.id            AS persona_id,
         ld.nombre,
         ld.apellido,
         ld.email,
         'docente'::text  AS origen,
         false            AS tiene_cuenta,
         CASE WHEN ld.estado = 'activo' THEN true ELSE false END AS activo,
         false            AS cuenta_activada,
         NULL::timestamptz AS ultimo_acceso,
         '{}'::text[]     AS roles
       FROM legajos_docentes ld
       WHERE ld.institucion_id = $1
         AND ld.usuario_id IS NULL

       UNION ALL

       -- Alumnos SIN cuenta de usuario
       SELECT
         a.id             AS id,
         a.id             AS persona_id,
         a.nombre,
         a.apellido,
         a.email,
         'alumno'::text   AS origen,
         false            AS tiene_cuenta,
         CASE WHEN a.estado = 'activo' THEN true ELSE false END AS activo,
         false            AS cuenta_activada,
         NULL::timestamptz AS ultimo_acceso,
         '{}'::text[]     AS roles
       FROM alumnos a
       WHERE a.institucion_id = $1
         AND a.usuario_id IS NULL

       UNION ALL

       -- Staff administrativo SIN cuenta de usuario
       SELECT
         sa.id            AS id,
         sa.id            AS persona_id,
         sa.nombre,
         sa.apellido,
         sa.email,
         'administrativo'::text AS origen,
         false            AS tiene_cuenta,
         CASE WHEN sa.estado = 'activo' THEN true ELSE false END AS activo,
         false            AS cuenta_activada,
         NULL::timestamptz AS ultimo_acceso,
         '{}'::text[]     AS roles
       FROM staff_administrativo sa
       WHERE sa.institucion_id = $1
         AND sa.usuario_id IS NULL

       ORDER BY apellido, nombre`,
      [institucionId],
    );
    return rows;
  }

  // ── Cuentas del sistema (admin / directivo / administrativo) ─────────────

  async findSistema(institucionId: string): Promise<UsuarioRow[]> {
    const { rows } = await this.pool.query<UsuarioRow>(
      `SELECT
         u.id, u.nombre, u.apellido, u.email, u.activo, u.cuenta_activada,
         u.ultimo_acceso, u.ultimo_envio_activacion, u.created_at,
         COALESCE(
           array_agg(r.nombre ORDER BY r.nombre) FILTER (
             WHERE r.nombre IS NOT NULL
               AND (ur.fecha_hasta IS NULL OR ur.fecha_hasta >= CURRENT_DATE)
           ), '{}'
         ) AS roles
       FROM usuarios u
       LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN roles r ON r.id = ur.rol_id AND r.institucion_id = u.institucion_id
       WHERE u.institucion_id = $1
       GROUP BY u.id
       HAVING COALESCE(
         array_agg(r.nombre) FILTER (
           WHERE r.nombre IN ('admin','directivo','administrativo')
             AND (ur.fecha_hasta IS NULL OR ur.fecha_hasta >= CURRENT_DATE)
         ), '{}'
       ) <> '{}'
       ORDER BY u.apellido, u.nombre`,
      [institucionId],
    );
    return rows;
  }

  // ── Pendientes de activación ──────────────────────────────────────────────

  async findPendientes(institucionId: string): Promise<PendienteActivacion[]> {
    const { rows } = await this.pool.query<PendienteActivacion>(
      `SELECT
         u.id,
         u.nombre,
         u.apellido,
         u.email,
         u.created_at,
         u.ultimo_envio_activacion,
         u.activation_token_expires_at,
         COALESCE(
           (SELECT 'alumno'       FROM alumnos              a WHERE a.usuario_id = u.id LIMIT 1),
           (SELECT 'docente'      FROM legajos_docentes     ld WHERE ld.usuario_id = u.id LIMIT 1),
           (SELECT 'administrativo' FROM staff_administrativo sa WHERE sa.usuario_id = u.id LIMIT 1),
           'sistema'
         ) AS tipo_entidad
       FROM usuarios u
       WHERE u.institucion_id = $1
         AND u.cuenta_activada = false
         AND u.activo = true
       ORDER BY u.created_at DESC`,
      [institucionId],
    );
    return rows;
  }

  // ── Cancelar cuenta pendiente (soft delete) ───────────────────────────────

  async cancelarPendiente(usuarioId: string, institucionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query<{ id: string }>(
        `SELECT id FROM usuarios WHERE id = $1 AND institucion_id = $2 AND cuenta_activada = false`,
        [usuarioId, institucionId],
      );
      if (rows.length === 0) {
        throw new NotFoundException('Usuario pendiente no encontrado o ya activado');
      }

      // Desvincular de entidades
      await client.query(`UPDATE alumnos              SET usuario_id = NULL WHERE usuario_id = $1`, [usuarioId]);
      await client.query(`UPDATE legajos_docentes     SET usuario_id = NULL WHERE usuario_id = $1`, [usuarioId]);
      await client.query(`UPDATE staff_administrativo SET usuario_id = NULL WHERE usuario_id = $1`, [usuarioId]);

      // Soft delete: desactivar y limpiar token
      await client.query(
        `UPDATE usuarios
         SET activo                      = false,
             activation_token            = NULL,
             activation_token_expires_at = NULL,
             updated_at                  = NOW()
         WHERE id = $1`,
        [usuarioId],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Búsqueda por id ──────────────────────────────────────────────────────

  async findById(id: string, institucionId: string): Promise<UsuarioRow | null> {
    const { rows } = await this.pool.query<UsuarioRow>(
      `SELECT
         u.id, u.nombre, u.apellido, u.email, u.activo, u.cuenta_activada,
         u.ultimo_acceso, u.created_at,
         COALESCE(
           array_agg(r.nombre ORDER BY r.nombre) FILTER (
             WHERE r.nombre IS NOT NULL
               AND (ur.fecha_hasta IS NULL OR ur.fecha_hasta >= CURRENT_DATE)
           ), '{}'
         ) AS roles
       FROM usuarios u
       LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN roles r ON r.id = ur.rol_id AND r.institucion_id = u.institucion_id
       WHERE u.id = $1 AND u.institucion_id = $2
       GROUP BY u.id`,
      [id, institucionId],
    );
    return rows[0] ?? null;
  }

  // ── Crear cuenta directa (flujo de activación por email) ─────────────────

  async create(data: CreateUsuarioData): Promise<{ usuario: UsuarioRow; rawToken: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: existing } = await client.query(
        `SELECT id FROM usuarios WHERE email = $1 AND institucion_id = $2`,
        [data.email.toLowerCase().trim(), data.institucionId],
      );
      if (existing.length > 0) {
        throw new ConflictException(`Ya existe un usuario con el email ${data.email}`);
      }

      const rolId       = await this._getRolId(client, data.rol, data.institucionId);
      const tempPassword = crypto.randomBytes(24).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const { rows: [usuario] } = await client.query<{ id: string }>(
        `INSERT INTO usuarios (institucion_id, email, password_hash, nombre, apellido, activo, primer_acceso, cuenta_activada)
         VALUES ($1, $2, $3, $4, $5, true, true, false) RETURNING id`,
        [data.institucionId, data.email.toLowerCase().trim(), passwordHash, data.nombre, data.apellido],
      );

      await client.query(
        `INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2)`,
        [usuario.id, rolId],
      );

      // Token de activación (24h)
      const rawToken    = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt   = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await client.query(
        `UPDATE usuarios SET activation_token = $1, activation_token_expires_at = $2 WHERE id = $3`,
        [hashedToken, expiresAt, usuario.id],
      );

      await client.query('COMMIT');
      return { usuario: (await this.findById(usuario.id, data.institucionId))!, rawToken };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Crear cuenta desde alumno, docente o administrativo ──────────────────

  async createFromPersona(data: CreateFromPersonaData): Promise<{ usuario: UsuarioRow; rawToken: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let nombre: string, apellido: string, email: string | null;

      if (data.origen === 'docente') {
        const { rows } = await client.query(
          `SELECT nombre, apellido, email, usuario_id
           FROM legajos_docentes WHERE id = $1 AND institucion_id = $2`,
          [data.personaId, data.institucionId],
        );
        if (rows.length === 0) throw new NotFoundException('Docente no encontrado');
        if (rows[0].usuario_id) throw new ConflictException('El docente ya tiene cuenta de usuario');
        ({ nombre, apellido, email } = rows[0]);
      } else if (data.origen === 'administrativo') {
        const { rows } = await client.query(
          `SELECT nombre, apellido, email, usuario_id
           FROM staff_administrativo WHERE id = $1 AND institucion_id = $2`,
          [data.personaId, data.institucionId],
        );
        if (rows.length === 0) throw new NotFoundException('Administrativo no encontrado');
        if (rows[0].usuario_id) throw new ConflictException('El administrativo ya tiene cuenta de usuario');
        ({ nombre, apellido, email } = rows[0]);
      } else {
        const { rows } = await client.query(
          `SELECT nombre, apellido, email, usuario_id
           FROM alumnos WHERE id = $1 AND institucion_id = $2`,
          [data.personaId, data.institucionId],
        );
        if (rows.length === 0) throw new NotFoundException(`Alumno no encontrado (id: ${data.personaId})`);
        if (rows[0].usuario_id) throw new ConflictException('El alumno ya tiene cuenta de usuario');
        ({ nombre, apellido, email } = rows[0]);
      }

      if (!email) throw new ConflictException('La persona no tiene email registrado. Agregá el email primero.');

      const { rows: existing } = await client.query(
        `SELECT id FROM usuarios WHERE email = $1 AND institucion_id = $2`,
        [email.toLowerCase().trim(), data.institucionId],
      );
      if (existing.length > 0) throw new ConflictException(`Ya existe una cuenta con el email ${email}`);

      const rolId       = await this._getRolId(client, data.rol, data.institucionId);
      const tempPassword = crypto.randomBytes(24).toString('hex');
      const pwHash      = await bcrypt.hash(tempPassword, 10);

      const { rows: [usuario] } = await client.query<{ id: string }>(
        `INSERT INTO usuarios (institucion_id, email, password_hash, nombre, apellido, activo, primer_acceso, cuenta_activada)
         VALUES ($1, $2, $3, $4, $5, true, true, false) RETURNING id`,
        [data.institucionId, email.toLowerCase().trim(), pwHash, nombre, apellido],
      );

      await client.query(
        `INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2)`,
        [usuario.id, rolId],
      );

      // Vincular usuario_id en la tabla origen
      const tabla = data.origen === 'docente'
        ? 'legajos_docentes'
        : data.origen === 'administrativo'
          ? 'staff_administrativo'
          : 'alumnos';

      await client.query(
        `UPDATE ${tabla} SET usuario_id = $1 WHERE id = $2`,
        [usuario.id, data.personaId],
      );

      // Token de activación (24h)
      const rawToken    = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt   = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await client.query(
        `UPDATE usuarios SET activation_token = $1, activation_token_expires_at = $2 WHERE id = $3`,
        [hashedToken, expiresAt, usuario.id],
      );

      await client.query('COMMIT');
      return { usuario: (await this.findById(usuario.id, data.institucionId))!, rawToken };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Actualizar usuario ────────────────────────────────────────────────────

  async update(id: string, institucionId: string, data: UpdateUsuarioData): Promise<UsuarioRow> {
    const usuario = await this.findById(id, institucionId);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (data.nombre !== undefined || data.apellido !== undefined || data.activo !== undefined) {
        const sets: string[] = [];
        const vals: unknown[] = [];
        let idx = 1;
        if (data.nombre   !== undefined) { sets.push(`nombre   = $${idx++}`); vals.push(data.nombre); }
        if (data.apellido !== undefined) { sets.push(`apellido = $${idx++}`); vals.push(data.apellido); }
        if (data.activo   !== undefined) { sets.push(`activo   = $${idx++}`); vals.push(data.activo); }
        vals.push(id);
        await client.query(
          `UPDATE usuarios SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
          vals,
        );
      }

      if (data.rol !== undefined) {
        const rolId = await this._getRolId(client, data.rol, institucionId);
        await client.query(
          `UPDATE usuario_roles SET fecha_hasta = CURRENT_DATE - 1
           WHERE usuario_id = $1 AND fecha_hasta IS NULL`,
          [id],
        );
        await client.query(
          `INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2)`,
          [id, rolId],
        );
      }

      await client.query('COMMIT');
      return (await this.findById(id, institucionId))!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Helper privado ───────────────────────────────────────────────────────

  private async _getRolId(client: any, rolNombre: string, institucionId: string): Promise<string> {
    const { rows } = await client.query(
      `SELECT id FROM roles WHERE nombre = $1 AND institucion_id = $2`,
      [rolNombre, institucionId],
    );
    if (rows.length === 0) throw new NotFoundException(`El rol '${rolNombre}' no existe`);
    return rows[0].id;
  }
}
