import { Injectable, NotFoundException } from '@nestjs/common';
import { AsistenciasRepository } from './asistencias.repository';
import { RegistrarAsistenciaDto } from './dto/registrar-asistencia.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class AsistenciasService {
  constructor(private readonly repo: AsistenciasRepository) {}

  async registrar(dto: RegistrarAsistenciaDto, user: JwtPayload) {
    const ciclo_lectivo = new Date(dto.fecha).getFullYear();
    return this.repo.registrarBulk({
      institucion_id: user.inst,
      curso_id:       dto.curso_id,
      materia_id:     dto.materia_id,
      fecha:          dto.fecha,
      ciclo_lectivo,
      registrado_por: user.sub,
      items:          dto.asistencias,
    });
  }

  getByClase(curso_id: string, materia_id: string, fecha: string, user: JwtPayload) {
    return this.repo.findByClase(curso_id, materia_id, fecha, user.inst);
  }

  getResumen(curso_id: string, materia_id: string, ciclo: number, user: JwtPayload) {
    return this.repo.getResumen(curso_id, materia_id, ciclo, user.inst);
  }

  getFechasClase(curso_id: string, materia_id: string, ciclo: number, user: JwtPayload) {
    return this.repo.getFechasClase(curso_id, materia_id, ciclo, user.inst);
  }

  getByAlumno(alumno_id: string, ciclo: number, user: JwtPayload, materia_id?: string) {
    return this.repo.findByAlumno(alumno_id, ciclo, user.inst, materia_id);
  }

  async updateOne(id: string, estado: string, observaciones: string | undefined, user: JwtPayload) {
    const updated = await this.repo.updateOne(id, user.inst, estado, observaciones);
    if (!updated) throw new NotFoundException('Registro de asistencia no encontrado');
    return updated;
  }
}
