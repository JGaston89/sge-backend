import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  UsuariosRepository,
  UpdateUsuarioData,
  type OrigenPersona,
} from './usuarios.repository';
import { MailerService } from '../mailer/mailer.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

interface CreateUsuarioInput {
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
}

interface CreateFromPersonaInput {
  personaId: string;
  origen: OrigenPersona;
  rol: string;
}

const ROLES_SOLO_ADMIN = ['admin'];

@Injectable()
export class UsuariosService {
  constructor(
    private readonly repo: UsuariosRepository,
    private readonly mailer: MailerService,
  ) {}

  findAll(user: JwtPayload) {
    return this.repo.findAllUnified(user.inst);
  }

  findSistema(user: JwtPayload) {
    return this.repo.findSistema(user.inst);
  }

  findPendientes(user: JwtPayload) {
    return this.repo.findPendientes(user.inst);
  }

  async cancelarPendiente(id: string, user: JwtPayload) {
    return this.repo.cancelarPendiente(id, user.inst);
  }

  async create(dto: CreateUsuarioInput, user: JwtPayload) {
    if (ROLES_SOLO_ADMIN.includes(dto.rol) && !user.roles.includes('admin')) {
      throw new ForbiddenException('Solo el administrador puede crear usuarios con rol admin');
    }
    const { usuario, rawToken } = await this.repo.create({ ...dto, institucionId: user.inst });
    await this.mailer.sendActivationEmail(usuario.email, usuario.nombre, rawToken);
    return usuario;
  }

  async createFromPersona(dto: CreateFromPersonaInput, user: JwtPayload) {
    if (ROLES_SOLO_ADMIN.includes(dto.rol) && !user.roles.includes('admin')) {
      throw new ForbiddenException('Solo el administrador puede asignar el rol admin');
    }
    const { usuario, rawToken } = await this.repo.createFromPersona({ ...dto, institucionId: user.inst });
    await this.mailer.sendActivationEmail(usuario.email, usuario.nombre, rawToken);
    return usuario;
  }

  update(id: string, dto: UpdateUsuarioData, user: JwtPayload) {
    if (dto.rol && ROLES_SOLO_ADMIN.includes(dto.rol) && !user.roles.includes('admin')) {
      throw new ForbiddenException('Solo el administrador puede asignar el rol admin');
    }
    return this.repo.update(id, user.inst, dto);
  }
}
