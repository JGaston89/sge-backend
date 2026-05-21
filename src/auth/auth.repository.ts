import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

export interface Usuario {
  id: string;
  institucion_id: string;
  email: string;
  password_hash: string;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
  totp_secret: string | null;
  totp_activo: boolean;
  recovery_codes: string[] | null;
  activo: boolean;
  primer_acceso: boolean;
  cuenta_activada: boolean;
  intentos_fallidos: number;
  bloqueado_hasta: Date | null;
  ultimo_acceso: Date | null;
  ultimo_envio_activacion: Date | null;
  roles: string[];
}

@Injectable()
export class AuthRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByEmail(email: string, institucionId: string): Promise<Usuario | null> {
    const { rows } = await this.pool.query<Usuario>(
      `SELECT
         u.*,
         COALESCE(
           array_agg(r.nombre) FILTER (
             WHERE r.nombre IS NOT NULL
               AND (ur.fecha_hasta IS NULL OR ur.fecha_hasta >= CURRENT_DATE)
           ),
           '{}'
         ) AS roles
       FROM usuarios u
       LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN roles r ON r.id = ur.rol_id
       WHERE u.email = $1
         AND u.institucion_id = $2
       GROUP BY u.id`,
      [email.toLowerCase().trim(), institucionId],
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<Usuario | null> {
    const { rows } = await this.pool.query<Usuario>(
      `SELECT
         u.*,
         COALESCE(
           array_agg(r.nombre) FILTER (
             WHERE r.nombre IS NOT NULL
               AND (ur.fecha_hasta IS NULL OR ur.fecha_hasta >= CURRENT_DATE)
           ),
           '{}'
         ) AS roles
       FROM usuarios u
       LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN roles r ON r.id = ur.rol_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByActivationToken(hashedToken: string): Promise<Usuario | null> {
    const { rows } = await this.pool.query<Usuario>(
      `SELECT
         u.*,
         COALESCE(
           array_agg(r.nombre) FILTER (
             WHERE r.nombre IS NOT NULL
               AND (ur.fecha_hasta IS NULL OR ur.fecha_hasta >= CURRENT_DATE)
           ),
           '{}'
         ) AS roles
       FROM usuarios u
       LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN roles r ON r.id = ur.rol_id
       WHERE u.activation_token = $1
         AND u.activation_token_expires_at > NOW()
       GROUP BY u.id`,
      [hashedToken],
    );
    return rows[0] ?? null;
  }

  async storeActivationToken(userId: string, hashedToken: string, expiresAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE usuarios
       SET activation_token              = $1,
           activation_token_expires_at  = $2,
           ultimo_envio_activacion      = NOW()
       WHERE id = $3`,
      [hashedToken, expiresAt, userId],
    );
  }

  async markPendingActivation(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE usuarios SET cuenta_activada = false WHERE id = $1`,
      [userId],
    );
  }

  async activateAccount(userId: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE usuarios
       SET password_hash                = $1,
           cuenta_activada              = true,
           primer_acceso                = true,
           activation_token             = NULL,
           activation_token_expires_at  = NULL,
           password_changed_at          = NOW()
       WHERE id = $2`,
      [passwordHash, userId],
    );
  }

  async registerFailedAttempt(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE usuarios
       SET intentos_fallidos = intentos_fallidos + 1,
           bloqueado_hasta = CASE
             WHEN intentos_fallidos + 1 >= 5
             THEN NOW() + INTERVAL '15 minutes'
             ELSE bloqueado_hasta
           END
       WHERE id = $1`,
      [userId],
    );
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE usuarios
       SET intentos_fallidos = 0,
           bloqueado_hasta   = NULL,
           ultimo_acceso     = NOW()
       WHERE id = $1`,
      [userId],
    );
  }

  async saveRefreshToken(data: {
    usuario_id: string;
    token_hash: string;
    user_agent?: string;
    ip?: string;
    expires_at: Date;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO refresh_tokens (usuario_id, token_hash, user_agent, ip, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.usuario_id, data.token_hash, data.user_agent, data.ip, data.expires_at],
    );
  }

  async findRefreshToken(
    tokenHash: string,
  ): Promise<{ usuario_id: string; expires_at: Date; revoked: boolean } | null> {
    const { rows } = await this.pool.query(
      `SELECT usuario_id, expires_at, revoked
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    );
    return rows[0] ?? null;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE refresh_tokens
       SET revoked = true, revoked_at = NOW()
       WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE refresh_tokens
       SET revoked = true, revoked_at = NOW()
       WHERE usuario_id = $1 AND revoked = false`,
      [userId],
    );
  }

  async updateTotpSecret(
    userId: string,
    secret: string,
    recoveryCodes: string[],
  ): Promise<void> {
    await this.pool.query(
      `UPDATE usuarios
       SET totp_secret = $1, totp_activo = true, recovery_codes = $2
       WHERE id = $3`,
      [secret, recoveryCodes, userId],
    );
  }

  async disableTotp(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE usuarios
       SET totp_secret = NULL, totp_activo = false, recovery_codes = NULL
       WHERE id = $1`,
      [userId],
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE usuarios
       SET password_hash = $1, password_changed_at = NOW(), primer_acceso = false
       WHERE id = $2`,
      [passwordHash, userId],
    );
  }

  async getInstituciones(): Promise<Array<{ id: string; nombre: string }>> {
    const { rows } = await this.pool.query<{ id: string; nombre: string }>(
      `SELECT id, nombre FROM instituciones WHERE activo = true ORDER BY nombre`,
    );
    return rows;
  }

  async auditLog(data: {
    usuario_id?: string;
    accion: string;
    tabla?: string;
    registro_id?: string;
    ip?: string;
    user_agent?: string;
    payload_before?: unknown;
    payload_after?: unknown;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log
         (usuario_id, accion, tabla, registro_id, ip, user_agent, payload_before, payload_after)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        data.usuario_id ?? null,
        data.accion,
        data.tabla ?? null,
        data.registro_id ?? null,
        data.ip ?? null,
        data.user_agent ?? null,
        data.payload_before ? JSON.stringify(data.payload_before) : null,
        data.payload_after  ? JSON.stringify(data.payload_after)  : null,
      ],
    );
  }
}
