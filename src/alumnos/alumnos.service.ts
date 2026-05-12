import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AlumnosRepository, Alumno, AlumnoPage, HistorialEntry, AlumnoEnRiesgo } from './alumnos.repository';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { UpdateAlumnoDto } from './dto/update-alumno.dto';
import { BajaAlumnoDto } from './dto/baja-alumno.dto';
import { QueryAlumnosDto } from './dto/query-alumnos.dto';

@Injectable()
export class AlumnosService {
  private readonly logger = new Logger(AlumnosService.name);

  constructor(private readonly alumnosRepo: AlumnosRepository) {}

  // ─── ALTA ─────────────────────────────────────────────────

  async create(dto: CreateAlumnoDto, user: JwtPayload): Promise<Alumno> {
    const existente = await this.alumnosRepo.findByDni(dto.dni, user.inst);
    if (existente) {
      throw new ConflictException(
        `Ya existe un alumno con DNI ${dto.dni} en esta institución`,
      );
    }

    const numeroLegajo = await this.alumnosRepo.generarNumeroLegajo(user.inst);
    const alumno = await this.alumnosRepo.create(user.inst, dto, numeroLegajo);

    await this.alumnosRepo.auditLog({
      usuario_id:    user.sub,
      accion:        'ALUMNO_CREADO',
      registro_id:   alumno.id,
      payload_after: alumno,
    });

    this.logger.log(`Alumno creado: legajo ${alumno.numero_legajo} por ${user.email}`);
    return alumno;
  }

  // ─── LISTADO ──────────────────────────────────────────────

  async findAll(query: QueryAlumnosDto, user: JwtPayload): Promise<AlumnoPage> {
    return this.alumnosRepo.findAll(user.inst, {
      q:      query.q,
      estado: query.estado,
      cursor: query.cursor,
      limit:  query.limit ?? 20,
    });
  }

  // ─── LEGAJO COMPLETO ──────────────────────────────────────

  async findOne(id: string, user: JwtPayload): Promise<Alumno> {
    const alumno = await this.alumnosRepo.findById(id, user.inst);
    if (!alumno) {
      throw new NotFoundException(`Alumno con id ${id} no encontrado`);
    }
    return alumno;
  }

  // ─── ACTUALIZACIÓN PARCIAL ────────────────────────────────

  async update(id: string, dto: UpdateAlumnoDto, user: JwtPayload): Promise<Alumno> {
    const antes = await this.alumnosRepo.findById(id, user.inst);
    if (!antes) {
      throw new NotFoundException(`Alumno con id ${id} no encontrado`);
    }
    if (antes.estado === 'baja') {
      throw new ConflictException('No se puede modificar un alumno dado de baja');
    }

    const despues = await this.alumnosRepo.update(id, user.inst, dto);

    await this.alumnosRepo.auditLog({
      usuario_id:     user.sub,
      accion:         'ALUMNO_MODIFICADO',
      registro_id:    id,
      payload_before: antes,
      payload_after:  despues,
    });

    return despues;
  }

  // ─── BAJA ─────────────────────────────────────────────────

  async darDeBaja(id: string, dto: BajaAlumnoDto, user: JwtPayload): Promise<Alumno> {
    const alumno = await this.alumnosRepo.findById(id, user.inst);
    if (!alumno) {
      throw new NotFoundException(`Alumno con id ${id} no encontrado`);
    }
    if (alumno.estado === 'baja') {
      throw new ConflictException('El alumno ya se encuentra dado de baja');
    }

    const fechaBaja = dto.fecha_baja ?? new Date().toISOString().split('T')[0];
    const resultado = await this.alumnosRepo.darDeBaja(id, user.inst, dto.motivo, fechaBaja);

    await this.alumnosRepo.auditLog({
      usuario_id:     user.sub,
      accion:         'ALUMNO_BAJA',
      registro_id:    id,
      payload_before: { estado: alumno.estado },
      payload_after:  { estado: 'baja', motivo: dto.motivo, fecha_baja: fechaBaja },
    });

    this.logger.warn(
      `Baja de alumno: legajo ${alumno.numero_legajo} — motivo: ${dto.motivo} — por ${user.email}`,
    );
    return resultado;
  }

  // ─── RIESGO ACADÉMICO ─────────────────────────────────────

  async getEnRiesgo(ciclo: number, user: JwtPayload): Promise<AlumnoEnRiesgo[]> {
    return this.alumnosRepo.findEnRiesgo(user.inst, ciclo);
  }

  // ─── HISTORIAL ────────────────────────────────────────────

  async getHistorial(id: string, user: JwtPayload): Promise<HistorialEntry[]> {
    const alumno = await this.alumnosRepo.findById(id, user.inst);
    if (!alumno) {
      throw new NotFoundException(`Alumno con id ${id} no encontrado`);
    }
    return this.alumnosRepo.getHistorial(id);
  }
}
