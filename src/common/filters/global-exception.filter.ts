import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let code    = 'INTERNAL_ERROR';
    let message = 'Error interno del servidor';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as Record<string, unknown>;

      // Errores de validación de class-validator (400)
      if (Array.isArray(res['message'])) {
        code    = 'VALIDATION_ERROR';
        message = 'Datos inválidos';
        details = (res['message'] as string[]).map((m) => ({ message: m }));
      } else {
        code    = (res['code'] as string) || exception.name.replace('Exception', '').toUpperCase();
        message = (res['message'] as string) || exception.message;
        details = res['details'];
      }
    } else if ((exception as { code?: string }).code === '23505') {
      // Violación de unique constraint en PostgreSQL
      status  = 409;
      code    = 'CONFLICT';
      message = 'El registro ya existe';
    } else {
      // Error no esperado — loguear completo
      this.logger.error(
        `[${request.method}] ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      ok:        false,
      code,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path:      request.url,
    });
  }
}
