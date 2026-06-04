import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';

import appConfig     from './config/app.config';
import authConfig    from './config/auth.config';
import databaseConfig from './config/database.config';

import { DatabaseModule }          from './database/database.module';
import { RedisModule }             from './database/redis.module';
import { MailerModule }            from './mailer/mailer.module';
import { CuentasModule }           from './cuentas/cuentas.module';
import { AuthModule }              from './auth/auth.module';
import { AlumnosModule }           from './alumnos/alumnos.module';
import { CalificacionesModule }    from './calificaciones/calificaciones.module';
import { PdfModule }              from './pdf/pdf.module';
import { ActasModule }            from './actas/actas.module';
import { InscripcionesModule }    from './inscripciones/inscripciones.module';
import { AlertasModule }          from './alertas/alertas.module';
import { AltaAcademicaModule }    from './alta-academica/alta-academica.module';
import { AsistenciasModule }      from './asistencias/asistencias.module';
import { PlanificacionModule }    from './planificacion/planificacion.module';
import { DocentesModule }        from './docentes/docentes.module';
import { CalendarioModule }      from './calendario/calendario.module';
import { ExamenesModule }        from './examenes/examenes.module';
import { BibliotecaModule }      from './biblioteca/biblioteca.module';
import { EspaciosModule }        from './espacios/espacios.module';
import { ComunicacionModule }    from './comunicacion/comunicacion.module';
import { UsuariosModule }        from './usuarios/usuarios.module';
import { AdministrativosModule } from './administrativos/administrativos.module';
import { PortalModule }          from './portal/portal.module';

import { GlobalExceptionFilter }      from './common/filters/global-exception.filter';
import { ResponseInterceptor }        from './common/interceptors/response.interceptor';
import { JwtAuthGuard }               from './auth/guards/jwt-auth.guard';
import { RolesGuard }                 from './auth/guards/roles.guard';
import { MxCacheService }             from './common/services/mx-cache.service';
import { IsValidEmailConstraint }     from './common/validators/email.validator';

@Module({
  imports: [
    // ─── Configuración global ─────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // ─── Rate limiting global (ThrottlerGuard por módulo) ─
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ─── Infraestructura ──────────────────────────────────
    DatabaseModule,
    RedisModule,
    MailerModule,
    CuentasModule,

    // ─── Módulos de negocio ───────────────────────────────
    AuthModule,
    AlumnosModule,
    CalificacionesModule,
    PdfModule,
    ActasModule,
    InscripcionesModule,
    AlertasModule,
    AltaAcademicaModule,
    AsistenciasModule,
    PlanificacionModule,
    DocentesModule,
    CalendarioModule,
    ExamenesModule,
    BibliotecaModule,
    EspaciosModule,
    ComunicacionModule,
    UsuariosModule,
    AdministrativosModule,
    PortalModule,

    // ─── Health checks ────────────────────────────────────
    TerminusModule,
  ],
  providers: [
    // Filtro global de errores
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Interceptor: envuelve todas las respuestas en { ok, data }
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },

    // Guards globales: JWT + RBAC
    // Los endpoints públicos usan el decorador @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    // Validadores custom (necesitan DI de NestJS via useContainer en main.ts)
    MxCacheService,
    IsValidEmailConstraint,
  ],
})
export class AppModule {}
