import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port      = config.get<number>('app.port', 3000);
  const prefix    = config.get<string>('app.apiPrefix', 'api/v1');
  const corsOrigin = config.get<string>('app.corsOrigin', 'http://localhost:5173');
  const nodeEnv   = config.get<string>('app.nodeEnv', 'development');

  // ─── Seguridad ────────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: nodeEnv === 'production'
      ? corsOrigin
      : (origin: string | undefined, cb: (e: Error | null, allow?: boolean) => void) => {
          // En desarrollo permite cualquier localhost (cualquier puerto)
          if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) cb(null, true);
          else cb(new Error('Not allowed by CORS'));
        },
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Prefijo global ───────────────────────────────────────
  app.setGlobalPrefix(prefix);

  // ─── Validación global (class-validator) ──────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:        true,   // elimina props no declaradas en el DTO
      forbidNonWhitelisted: false,
      transform:        true,   // castea tipos automáticamente
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger (solo en desarrollo) ────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SGE — Sistema de Gestión Educativa')
      .setDescription('API REST del sistema educativo. Sprint 5: Autenticación y RBAC.')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Autenticación')
      .addTag('Alumnos')
      .addTag('Calificaciones')
      .addTag('Asistencia')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log(`📖 Swagger disponible en: http://localhost:${port}/${prefix}/docs`);
  }

  // ─── Graceful shutdown ────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`🚀 SGE Backend en puerto ${port} [${nodeEnv}]`);
  logger.log(`   Prefix: /${prefix}`);
}

bootstrap().catch((err) => {
  console.error('Error al iniciar la aplicación:', err);
  process.exit(1);
});
