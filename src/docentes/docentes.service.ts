import { Injectable } from '@nestjs/common';
import { DocentesRepository } from './docentes.repository';
import type { CreateDocenteDto, UpdateDocenteDto, CreateAsignacionDto } from './dto/docentes.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class DocentesService {
  constructor(private readonly repo: DocentesRepository) {}

  findAll(user: JwtPayload, filters: { estado?: string; search?: string }) {
    return this.repo.findAll(user.inst, filters);
  }

  findOne(id: string, user: JwtPayload) {
    return this.repo.findOne(id, user.inst);
  }

  create(dto: CreateDocenteDto, user: JwtPayload) {
    return this.repo.create(user.inst, dto);
  }

  update(id: string, dto: UpdateDocenteDto, user: JwtPayload) {
    return this.repo.update(id, user.inst, dto);
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
