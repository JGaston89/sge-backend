import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CalendarioRepository } from './calendario.repository';
import type { CreateCicloDto, CreateEventoDto, ImportarFeriadosDto } from './dto/calendario.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

@Injectable()
export class CalendarioService {
  constructor(private readonly repo: CalendarioRepository) {}

  // ─── Ciclos lectivos ─────────────────────────────────────────

  async createCiclo(dto: CreateCicloDto, user: JwtPayload) {
    if (dto.fecha_fin <= dto.fecha_inicio) {
      throw new BadRequestException('fecha_fin debe ser posterior a fecha_inicio');
    }
    try {
      return await this.repo.createCiclo(user.inst, dto);
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException(`Ya existe un ciclo lectivo para el año ${dto.anio}`);
      }
      throw err;
    }
  }

  getCiclos(user: JwtPayload) {
    return this.repo.findCiclos(user.inst);
  }

  async getCicloActivo(user: JwtPayload) {
    const ciclo = await this.repo.findCicloActivo(user.inst);
    if (!ciclo) throw new NotFoundException('No hay ciclo lectivo activo para la fecha de hoy');
    return ciclo;
  }

  // ─── Eventos ─────────────────────────────────────────────────

  async createEvento(dto: CreateEventoDto, user: JwtPayload) {
    if (dto.ciclo_id) {
      const ciclo = await this.repo.findCicloById(dto.ciclo_id, user.inst);
      if (!ciclo) throw new NotFoundException('Ciclo lectivo no encontrado');
    }
    if (dto.fecha_fin && dto.fecha_fin < dto.fecha_inicio) {
      throw new BadRequestException('fecha_fin no puede ser anterior a fecha_inicio');
    }
    return this.repo.createEvento(user.inst, dto, user.sub);
  }

  getEventos(
    user: JwtPayload,
    opts: { desde?: string; hasta?: string; tipo?: string },
  ) {
    return this.repo.findEventos(user.inst, opts);
  }

  // ─── iCal export ─────────────────────────────────────────────

  async exportIcal(user: JwtPayload): Promise<string> {
    const eventos = await this.repo.findEventosParaIcal(user.inst);
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SGE//Calendario Academico//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const ev of eventos) {
      const dtstart = toIcalDate(ev.fecha_inicio);
      const dtend   = toIcalDate(ev.fecha_fin ?? ev.fecha_inicio, true);
      lines.push(
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        `SUMMARY:${escapeIcal(ev.titulo)}`,
        ...(ev.descripcion ? [`DESCRIPTION:${escapeIcal(ev.descripcion)}`] : []),
        `CATEGORIES:${ev.tipo}`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  // ─── Importar feriados desde Nager.Date ──────────────────────

  async importarFeriados(dto: ImportarFeriadosDto, user: JwtPayload) {
    if (dto.ciclo_id) {
      const ciclo = await this.repo.findCicloById(dto.ciclo_id, user.inst);
      if (!ciclo) throw new NotFoundException('Ciclo lectivo no encontrado');
    }

    let holidays: NagerHoliday[];
    try {
      const res = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${dto.anio}/AR`,
      );
      if (!res.ok) {
        throw new BadRequestException(
          `No se pudo obtener los feriados para el año ${dto.anio} (status ${res.status})`,
        );
      }
      holidays = await res.json() as NagerHoliday[];
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Error al conectar con la API de feriados (Nager.Date)');
    }

    const feriados = holidays.map((h) => ({
      fecha:       h.date,
      titulo:      h.localName,
      descripcion: h.name,
    }));

    const insertados = await this.repo.bulkInsertFeriados(
      user.inst,
      dto.ciclo_id ?? null,
      feriados,
      user.sub,
    );

    return {
      anio:      dto.anio,
      total:     holidays.length,
      insertados: insertados.length,
      feriados:  insertados,
    };
  }
}

// ─── Helpers iCal ─────────────────────────────────────────────

function toIcalDate(dateStr: string, nextDay = false): string {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (nextDay) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function escapeIcal(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
