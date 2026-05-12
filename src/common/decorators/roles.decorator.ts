import { SetMetadata } from '@nestjs/common';

export type Role =
  | 'admin'
  | 'directivo'
  | 'docente'
  | 'preceptor'
  | 'administrativo'
  | 'alumno'
  | 'familia';

export const ROLES_KEY = 'roles';

/**
 * Decora un endpoint con los roles permitidos.
 * Usado en conjunto con RolesGuard.
 *
 * @example
 * @Roles('admin', 'directivo')
 * @Get('reportes')
 * getReportes() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
