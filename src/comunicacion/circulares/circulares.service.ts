import { Injectable, NotFoundException } from '@nestjs/common';
import { CircularesRepository } from './circulares.repository';
import type { CreateCircularDto, UpdateCircularDto } from './dto/circular.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class CircularesService {
  constructor(private readonly repo: CircularesRepository) {}

  findAll(user: JwtPayload) {
    return this.repo.findAll(user.inst, user.sub, user.roles);
  }

  async findById(id: string, user: JwtPayload) {
    const circular = await this.repo.findById(id, user.inst, user.sub);
    if (!circular) throw new NotFoundException('Circular no encontrada');
    await this.repo.marcarLeida(id, user.sub);
    return { ...circular, visto: true };
  }

  create(dto: CreateCircularDto, user: JwtPayload) {
    return this.repo.create(user.inst, dto, user.sub);
  }

  async update(id: string, dto: UpdateCircularDto, user: JwtPayload) {
    const circular = await this.repo.update(id, user.inst, dto);
    if (!circular) throw new NotFoundException('Circular no encontrada');
    return circular;
  }

  async delete(id: string, user: JwtPayload) {
    const deleted = await this.repo.delete(id, user.inst);
    if (!deleted) throw new NotFoundException('Circular no encontrada');
    return { message: 'Circular eliminada' };
  }
}
