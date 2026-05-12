import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { AltaAcademicaRepository } from './alta-academica.repository';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class AltaAcademicaService {
  constructor(private readonly repo: AltaAcademicaRepository) {}

  // ─── CURSOS ───────────────────────────────────────────────

  getCursos(user: JwtPayload) {
    return this.repo.findCursos(user.inst);
  }

  async createCurso(data: {
    nombre: string;
    anio_academico: number;
    nivel?: string;
    turno?: string;
    materia_ids?: string[];
  }, user: JwtPayload) {
    try {
      const { materia_ids, ...cursoData } = data;
      const curso = await this.repo.createCurso({ ...cursoData, institucion_id: user.inst });
      if (materia_ids && materia_ids.length > 0) {
        await this.repo.syncCursoMaterias(curso.id, materia_ids);
        curso.materia_ids = materia_ids;
      }
      return curso;
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('Ya existe un curso con ese nombre y año');
      throw e;
    }
  }

  async updateCurso(id: string, data: {
    nombre?: string;
    anio_academico?: number;
    nivel?: string | null;
    turno?: string | null;
    materia_ids?: string[];
  }, user: JwtPayload) {
    const { materia_ids, ...cursoData } = data;
    const updated = await this.repo.updateCurso(id, user.inst, cursoData);
    if (!updated) throw new NotFoundException('Curso no encontrado');
    if (materia_ids !== undefined) {
      await this.repo.syncCursoMaterias(id, materia_ids);
      updated.materia_ids = materia_ids;
    }
    return updated;
  }

  async toggleCurso(id: string, user: JwtPayload) {
    const ok = await this.repo.deleteCurso(id, user.inst);
    if (!ok) throw new NotFoundException('Curso no encontrado');
    return { ok: true };
  }

  // ─── MATERIAS ─────────────────────────────────────────────

  getMaterias(user: JwtPayload) {
    return this.repo.findMaterias(user.inst);
  }

  async createMateria(data: { nombre: string; codigo?: string }, user: JwtPayload) {
    try {
      return await this.repo.createMateria({ ...data, institucion_id: user.inst });
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('Ya existe una materia con ese nombre');
      throw e;
    }
  }

  async updateMateria(id: string, data: { nombre?: string; codigo?: string | null }, user: JwtPayload) {
    const updated = await this.repo.updateMateria(id, user.inst, data);
    if (!updated) throw new NotFoundException('Materia no encontrada');
    return updated;
  }

  async toggleMateria(id: string, user: JwtPayload) {
    const ok = await this.repo.deleteMateria(id, user.inst);
    if (!ok) throw new NotFoundException('Materia no encontrada');
    return { ok: true };
  }

  // ─── PERIODOS ─────────────────────────────────────────────

  getPeriodos(user: JwtPayload) {
    return this.repo.findPeriodos(user.inst);
  }

  async createPeriodo(nombre: string, user: JwtPayload) {
    try {
      return await this.repo.createPeriodo({ nombre, institucion_id: user.inst });
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('Ya existe un período con ese nombre');
      throw e;
    }
  }

  async updatePeriodo(id: string, nombre: string, user: JwtPayload) {
    const updated = await this.repo.updatePeriodo(id, user.inst, nombre);
    if (!updated) throw new NotFoundException('Período no encontrado');
    return updated;
  }

  async togglePeriodo(id: string, user: JwtPayload) {
    const ok = await this.repo.deletePeriodo(id, user.inst);
    if (!ok) throw new NotFoundException('Período no encontrado');
    return { ok: true };
  }

  // ─── CICLOS LECTIVOS ──────────────────────────────────────

  getCiclos(user: JwtPayload) {
    return this.repo.findCiclos(user.inst);
  }

  async createCiclo(anio: number, user: JwtPayload) {
    try {
      return await this.repo.createCiclo({
        anio,
        nombre: String(anio),
        institucion_id: user.inst,
      });
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('Ya existe un ciclo lectivo con ese año');
      throw e;
    }
  }

  async updateCiclo(id: string, data: { anio?: number; nombre?: string }, user: JwtPayload) {
    const updated = await this.repo.updateCiclo(id, user.inst, data);
    if (!updated) throw new NotFoundException('Ciclo lectivo no encontrado');
    return updated;
  }

  async toggleCiclo(id: string, user: JwtPayload) {
    const ok = await this.repo.deleteCiclo(id, user.inst);
    if (!ok) throw new NotFoundException('Ciclo lectivo no encontrado');
    return { ok: true };
  }
}
