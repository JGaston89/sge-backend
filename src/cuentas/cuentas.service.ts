import * as crypto from 'crypto';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { DATABASE_POOL } from '../database/database.module';
import { MailerService } from '../mailer/mailer.service';

export type EntidadOrigen = 'alumnos' | 'legajos_docentes' | 'staff_administrativo';

export interface AutoCuentaParams {
  nombre:        string;
  apellido:      string;
  email:         string;
  rol:           string;
  institucionId: string;
  entidad:       EntidadOrigen;
  entidadId:     string;
}

export interface AutoCuentaResult {
  usuarioId:    string;
  esNueva:      boolean;
  emailEnviado: boolean;
}

@Injectable()
export class CuentasService {
  private readonly logger = new Logger(CuentasService.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly mailer: MailerService,
  ) {}

  /**
   * Auto-crea una cuenta de acceso para una entidad recién creada.
   * Si ya existe cuenta con ese email, agrega el rol y vincula el usuario.
   * Genera token de activación y envía email (fail-soft).
   */
  async autoCreateAccount(params: AutoCuentaParams): Promise<AutoCuentaResult> {
    const emailNorm = params.email.toLowerCase().trim();
    const client    = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // ¿Ya existe cuenta con ese email en la institución?
      const { rows: existing } = await client.query<{ id: string }>(
        `SELECT id FROM usuarios WHERE email = $1 AND institucion_id = $2`,
        [emailNorm, params.institucionId],
      );

      let usuarioId: string;
      let esNueva   = false;
      let rawToken: string | null = null;

      if (existing.length > 0) {
        // Ya tiene cuenta → agregar rol si no lo tiene
        usuarioId = existing[0].id;
        const rolId = await this._getRolId(client, params.rol, params.institucionId);
        // ON CONFLICT reactiva el rol si existía expirado, o lo agrega si no estaba
        await client.query(
          `INSERT INTO usuario_roles (usuario_id, rol_id)
           VALUES ($1, $2)
           ON CONFLICT (usuario_id, rol_id) DO UPDATE SET fecha_hasta = NULL`,
          [usuarioId, rolId],
        );
      } else {
        // Nueva cuenta con contraseña temporal (nunca expuesta)
        const tempPassword = crypto.randomBytes(24).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const rolId        = await this._getRolId(client, params.rol, params.institucionId);

        const { rows: [u] } = await client.query<{ id: string }>(
          `INSERT INTO usuarios (institucion_id, email, password_hash, nombre, apellido, activo, primer_acceso, cuenta_activada)
           VALUES ($1, $2, $3, $4, $5, true, true, false)
           RETURNING id`,
          [params.institucionId, emailNorm, passwordHash, params.nombre, params.apellido],
        );
        usuarioId = u.id;
        esNueva   = true;

        await client.query(
          `INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2)`,
          [usuarioId, rolId],
        );

        // Token de activación (24h)
        rawToken                = crypto.randomBytes(32).toString('hex');
        const hashedToken       = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt         = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await client.query(
          `UPDATE usuarios SET activation_token = $1, activation_token_expires_at = $2 WHERE id = $3`,
          [hashedToken, expiresAt, usuarioId],
        );
      }

      // Vincular usuario_id a la entidad origen
      await client.query(
        `UPDATE ${params.entidad} SET usuario_id = $1 WHERE id = $2`,
        [usuarioId, params.entidadId],
      );

      await client.query('COMMIT');

      // Enviar email (fail-soft)
      let emailEnviado = false;
      if (esNueva && rawToken) {
        try {
          await this.mailer.sendActivationEmail(emailNorm, params.nombre, rawToken);
          emailEnviado = true;
        } catch (mailErr) {
          this.logger.error(
            `No se pudo enviar email de activación a ${emailNorm}: ${(mailErr as Error).message}`,
          );
        }
      }

      if (esNueva) {
        this.logger.log(`Cuenta creada para ${emailNorm} (pendiente activación)`);
      } else {
        this.logger.log(`Cuenta existente reutilizada (${emailNorm}), rol ${params.rol} agregado`);
      }

      return { usuarioId, esNueva, emailEnviado };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async _getRolId(client: any, rolNombre: string, institucionId: string): Promise<string> {
    const { rows } = await client.query(
      `SELECT id FROM roles WHERE nombre = $1 AND institucion_id = $2`,
      [rolNombre, institucionId],
    );
    if (rows.length === 0) throw new Error(`El rol '${rolNombre}' no existe en la institución`);
    return rows[0].id;
  }
}
