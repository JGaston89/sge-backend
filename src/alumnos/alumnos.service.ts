import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AlumnosRepository, Alumno, AlumnoPage, HistorialEntry, AlumnoEnRiesgo } from './alumnos.repository';
import { TutoresRepository, TutorConRelacion, CreateTutorDto, LinkTutorDto } from './tutores.repository';
import { CuentasService } from '../cuentas/cuentas.service';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { UpdateAlumnoDto } from './dto/update-alumno.dto';
import { BajaAlumnoDto } from './dto/baja-alumno.dto';
import { QueryAlumnosDto } from './dto/query-alumnos.dto';

@Injectable()
export class AlumnosService {
  private readonly logger = new Logger(AlumnosService.name);

  constructor(
    private readonly alumnosRepo: AlumnosRepository,
    private readonly tutoresRepo: TutoresRepository,
    private readonly cuentas: CuentasService,
  ) {}

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

    // Auto-crear cuenta si tiene email (fire-and-forget: no bloquea la respuesta HTTP)
    if (dto.email) {
      void this.cuentas.autoCreateAccount({
        nombre:        alumno.nombre,
        apellido:      alumno.apellido,
        email:         dto.email,
        rol:           'alumno',
        institucionId: user.inst,
        entidad:       'alumnos',
        entidadId:     alumno.id,
      }).catch(err =>
        this.logger.error(`Error al auto-crear cuenta para alumno ${alumno.id}: ${err.message}`),
      );
    }

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

    // Si se agregó o cambió el email → crear/vincular cuenta y enviar activación (fire-and-forget)
    if (dto.email && dto.email !== antes.email) {
      void this.cuentas.autoCreateAccount({
        nombre:        despues.nombre,
        apellido:      despues.apellido,
        email:         dto.email,
        rol:           'alumno',
        institucionId: user.inst,
        entidad:       'alumnos',
        entidadId:     despues.id,
      }).catch(err =>
        this.logger.error(`Error al auto-crear cuenta para alumno ${despues.id}: ${err.message}`),
      );
    }

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
    if (!alumno) throw new NotFoundException(`Alumno con id ${id} no encontrado`);
    return this.alumnosRepo.getHistorial(id);
  }

  // ─── TUTORES ──────────────────────────────────────────────

  async getTutores(alumnoId: string, user: JwtPayload): Promise<TutorConRelacion[]> {
    await this.findOne(alumnoId, user);
    return this.tutoresRepo.findByAlumno(alumnoId);
  }

  async buscarTutor(tipoDocumento: string, numeroDocumento: string) {
    return this.tutoresRepo.buscarPorDocumento(tipoDocumento, numeroDocumento);
  }

  async addTutor(
    alumnoId: string,
    dto: { tutor: CreateTutorDto; relacion: LinkTutorDto; tutor_id?: string },
    user: JwtPayload,
  ): Promise<TutorConRelacion[]> {
    await this.findOne(alumnoId, user);

    let tutorId: string;

    if (dto.tutor_id) {
      // Vincular tutor existente
      const existing = await this.tutoresRepo.findById(dto.tutor_id);
      if (!existing) throw new NotFoundException('Tutor no encontrado');
      tutorId = dto.tutor_id;
    } else {
      // Crear tutor nuevo
      const created = await this.tutoresRepo.create(dto.tutor);
      tutorId = created.id;
    }

    await this.tutoresRepo.link(alumnoId, tutorId, dto.relacion);
    return this.tutoresRepo.findByAlumno(alumnoId);
  }

  async updateTutorDatos(
    alumnoId: string,
    tutorId: string,
    dto: Partial<CreateTutorDto>,
    user: JwtPayload,
  ) {
    await this.findOne(alumnoId, user);
    return this.tutoresRepo.update(tutorId, dto);
  }

  async updateRelacion(
    alumnoId: string,
    tutorId: string,
    dto: Partial<LinkTutorDto>,
    user: JwtPayload,
  ) {
    await this.findOne(alumnoId, user);
    await this.tutoresRepo.updateRelacion(alumnoId, tutorId, dto);
    return this.tutoresRepo.findByAlumno(alumnoId);
  }

  async removeTutor(alumnoId: string, tutorId: string, user: JwtPayload) {
    await this.findOne(alumnoId, user);
    await this.tutoresRepo.unlink(alumnoId, tutorId);
    return { ok: true };
  }
}
