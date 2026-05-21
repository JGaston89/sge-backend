import { Injectable, Logger } from '@nestjs/common';
import { DocentesRepository } from './docentes.repository';
import { CuentasService } from '../cuentas/cuentas.service';
import type { CreateDocenteDto, UpdateDocenteDto, CreateAsignacionDto } from './dto/docentes.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class DocentesService {
  private readonly logger = new Logger(DocentesService.name);

  constructor(
    private readonly repo: DocentesRepository,
    private readonly cuentas: CuentasService,
  ) {}

  findAll(user: JwtPayload, filters: { estado?: string; search?: string }) {
    return this.repo.findAll(user.inst, filters);
  }

  findOne(id: string, user: JwtPayload) {
    return this.repo.findOne(id, user.inst);
  }

  async create(dto: CreateDocenteDto, user: JwtPayload) {
    const docente = await this.repo.create(user.inst, dto);

    // Auto-crear cuenta si tiene email
    if (dto.email) {
      void this.cuentas.autoCreateAccount({
        nombre:        docente.nombre,
        apellido:      docente.apellido,
        email:         dto.email,
        rol:           'docente',
        institucionId: user.inst,
        entidad:       'legajos_docentes',
        entidadId:     docente.id,
      }).catch(err =>
        this.logger.error(`Error al auto-crear cuenta para docente ${docente.id}: ${err.message}`),
      );
    }

    return docente;
  }

  async update(id: string, dto: UpdateDocenteDto, user: JwtPayload) {
    const antes   = await this.repo.findOne(id, user.inst);
    const docente = await this.repo.update(id, user.inst, dto);

    // Si se agregó o cambió el email → crear/vincular cuenta y enviar activación
    if (dto.email && dto.email !== antes?.email) {
      void this.cuentas.autoCreateAccount({
        nombre:        docente.nombre,
        apellido:      docente.apellido,
        email:         dto.email,
        rol:           'docente',
        institucionId: user.inst,
        entidad:       'legajos_docentes',
        entidadId:     docente.id,
      }).catch(err =>
        this.logger.error(`Error al auto-crear cuenta para docente ${docente.id}: ${err.message}`),
      );
    }

    return docente;
  }

  remove(id: string, user: JwtPayload) {
    return this.repo.remove(id, user.inst);
  }

  findAsignaciones(
    user: JwtPayload,
    filters: { docente_id?: string; materia_id?: string; curso_id?: string; ciclo_lectivo?: number },
  ) {
    return this.repo.findAsignaciones(user.inst, filters);
  }

  createAsignacion(dto: CreateAsignacionDto, user: JwtPayload) {
    return this.repo.createAsignacion(user.inst, dto);
  }

  removeAsignacion(id: string, user: JwtPayload) {
    return this.repo.removeAsignacion(id, user.inst);
  }
}
