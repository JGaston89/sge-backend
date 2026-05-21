import { Injectable, Logger } from '@nestjs/common';
import { AdministrativosRepository } from './administrativos.repository';
import { CuentasService } from '../cuentas/cuentas.service';
import type { CreateAdministrativoDto, UpdateAdministrativoDto } from './dto/administrativos.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class AdministrativosService {
  private readonly logger = new Logger(AdministrativosService.name);

  constructor(
    private readonly repo: AdministrativosRepository,
    private readonly cuentas: CuentasService,
  ) {}

  findAll(user: JwtPayload, filters: { estado?: string; search?: string }) {
    return this.repo.findAll(user.inst, filters);
  }

  findOne(id: string, user: JwtPayload) {
    return this.repo.findOne(id, user.inst);
  }

  async create(dto: CreateAdministrativoDto, user: JwtPayload) {
    const administrativo = await this.repo.create(user.inst, dto);

    // Auto-crear cuenta si tiene email
    if (dto.email) {
      void this.cuentas.autoCreateAccount({
        nombre:        administrativo.nombre,
        apellido:      administrativo.apellido,
        email:         dto.email,
        rol:           'administrativo',
        institucionId: user.inst,
        entidad:       'staff_administrativo',
        entidadId:     administrativo.id,
      }).catch(err =>
        this.logger.error(`Error al auto-crear cuenta para administrativo ${administrativo.id}: ${err.message}`),
      );
    }

    return administrativo;
  }

  async update(id: string, dto: UpdateAdministrativoDto, user: JwtPayload) {
    const antes          = await this.repo.findOne(id, user.inst);
    const administrativo = await this.repo.update(id, user.inst, dto);

    // Si se agregó o cambió el email → crear/vincular cuenta y enviar activación
    if (dto.email && dto.email !== antes?.email) {
      void this.cuentas.autoCreateAccount({
        nombre:        administrativo.nombre,
        apellido:      administrativo.apellido,
        email:         dto.email,
        rol:           'administrativo',
        institucionId: user.inst,
        entidad:       'staff_administrativo',
        entidadId:     administrativo.id,
      }).catch(err =>
        this.logger.error(`Error al auto-crear cuenta para administrativo ${administrativo.id}: ${err.message}`),
      );
    }

    return administrativo;
  }

  remove(id: string, user: JwtPayload) {
    return this.repo.remove(id, user.inst);
  }
}
