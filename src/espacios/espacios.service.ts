import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { EspaciosRepository } from './espacios.repository';
import type {
  CreateEspacioDto, UpdateEspacioEstadoDto,
  CreateReservaEspacioDto, CreateMantenimientoDto, UpdateMantenimientoDto,
} from './dto/espacios.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class EspaciosService {
  constructor(private readonly repo: EspaciosRepository) {}

  // ─── Espacios ─────────────────────────────────────────────────

  createEspacio(dto: CreateEspacioDto, user: JwtPayload) {
    return this.repo.createEspacio(user.inst, dto, user.sub);
  }

  findEspacios(user: JwtPayload, tipo?: string) {
    return this.repo.findEspacios(user.inst, tipo);
  }

  async updateEstado(id: string, dto: UpdateEspacioEstadoDto, user: JwtPayload) {
    const e = await this.repo.updateEstado(id, user.inst, dto.estado);
    if (!e) throw new NotFoundException('Espacio no encontrado');
    return e;
  }

  // ─── Reservas ─────────────────────────────────────────────────

  async createReserva(espacioId: string, dto: CreateReservaEspacioDto, user: JwtPayload) {
    const hay = await this.repo.checkConflicto(espacioId, dto.fecha, dto.hora_inicio, dto.hora_fin);
    if (hay) {
      throw new ConflictException('El espacio ya tiene una reserva confirmada en ese horario');
    }
    return this.repo.createReserva(espacioId, user.inst, dto, user.sub);
  }

  findDisponibles(
    user: JwtPayload,
    fecha: string,
    hora_inicio: string,
    hora_fin: string,
  ) {
    return this.repo.findDisponibles(user.inst, fecha, hora_inicio, hora_fin);
  }

  getOcupacion(user: JwtPayload, semana: string) {
    return this.repo.getOcupacion(user.inst, semana);
  }

  getMisReservas(user: JwtPayload) {
    return this.repo.findMisReservas(user.sub, user.inst);
  }

  async cancelarReserva(id: string, user: JwtPayload) {
    const r = await this.repo.cancelarReserva(id, user.inst, user.sub);
    if (!r) throw new NotFoundException('Reserva no encontrada o ya cancelada');
    return r;
  }

  // ─── Mantenimiento ────────────────────────────────────────────

  createMantenimiento(dto: CreateMantenimientoDto, user: JwtPayload) {
    return this.repo.createMantenimiento(user.inst, dto, user.sub);
  }

  findMantenimiento(user: JwtPayload, estado?: string) {
    return this.repo.findMantenimiento(user.inst, estado);
  }

  async updateMantenimiento(id: string, dto: UpdateMantenimientoDto, user: JwtPayload) {
    const m = await this.repo.updateMantenimiento(id, user.inst, dto);
    if (!m) throw new NotFoundException('Solicitud de mantenimiento no encontrada');
    return m;
  }
}
