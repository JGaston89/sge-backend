import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly smtpConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    const smtpUser = this.config.get<string>('SMTP_USER', '');
    const smtpPass = this.config.get<string>('SMTP_PASS', '');
    this.smtpConfigured = !!(smtpUser && smtpPass);

    if (this.smtpConfigured) {
      this.logger.log('SMTP configurado correctamente');
    } else {
      this.logger.warn(
        'SMTP no configurado (SMTP_USER/SMTP_PASS vacíos). ' +
        'Los links de activación se mostrarán en los logs del servidor.',
      );
    }
  }

  private createTransporter() {
    return nodemailer.createTransport({
      host:   this.config.get<string>('SMTP_HOST'),
      port:   parseInt(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    } as Parameters<typeof nodemailer.createTransport>[0]);
  }

  async sendActivationEmail(to: string, nombre: string, rawToken: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const link   = `${appUrl}/activar-cuenta?token=${rawToken}`;

    if (!this.smtpConfigured) {
      this.logger.warn(`[DEV] Link de activación para ${to}: ${link}`);
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(`[DEV] Link de activación para ${to}: ${link}`);
    }

    const from = this.config.get<string>('SMTP_FROM', 'SGE <noreply@escuela.edu.ar>');
    try {
      const info = await this.createTransporter().sendMail({
        from,
        to,
        subject: 'Activá tu cuenta en el SGE',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#0f172a">Bienvenido/a, ${nombre}</h2>
            <p>Se creó una cuenta de acceso al Sistema de Gestión Educativa para vos.</p>
            <p>Hacé clic en el botón para activar tu cuenta y establecer tu contraseña:</p>
            <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              Activar mi cuenta
            </a>
            <p style="color:#64748b;font-size:13px">Este enlace es válido por 24 horas y solo puede usarse una vez.<br>Si no esperabas este email, podés ignorarlo.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
            <p style="color:#94a3b8;font-size:12px">Sistema de Gestión Educativa</p>
          </div>
        `,
      });
      this.logger.log(`Email de activación enviado a ${to} | messageId: ${info.messageId} | response: ${info.response}`);
    } catch (err) {
      this.logger.error(`Error al enviar email de activación a ${to}: ${(err as Error).message}`);
    }
  }

  async sendPasswordResetEmail(to: string, nombre: string, rawToken: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const link   = `${appUrl}/activar-cuenta?token=${rawToken}`;

    if (!this.smtpConfigured) {
      this.logger.warn(`[DEV] Link de reset para ${to}: ${link}`);
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(`[DEV] Link de reset para ${to}: ${link}`);
    }

    const from = this.config.get<string>('SMTP_FROM', 'SGE <noreply@escuela.edu.ar>');
    try {
      const info = await this.createTransporter().sendMail({
        from,
        to,
        subject: 'Restablecer contraseña — SGE',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#0f172a">Hola, ${nombre}</h2>
            <p>Un administrador solicitó el restablecimiento de tu contraseña en el Sistema de Gestión Educativa.</p>
            <p>Hacé clic en el botón para establecer una nueva contraseña:</p>
            <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              Restablecer contraseña
            </a>
            <p style="color:#64748b;font-size:13px">Este enlace es válido por 24 horas y solo puede usarse una vez.<br>Si no solicitaste este cambio, contactá al administrador.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
            <p style="color:#94a3b8;font-size:12px">Sistema de Gestión Educativa</p>
          </div>
        `,
      });
      this.logger.log(`Email de reset enviado a ${to} | messageId: ${info.messageId} | response: ${info.response}`);
    } catch (err) {
      this.logger.error(`Error al enviar email de reset a ${to}: ${(err as Error).message}`);
    }
  }
}
