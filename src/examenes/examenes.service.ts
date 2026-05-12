import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { ExamenesRepository } from './examenes.repository';
import type { CreateMesaDto, CargarNotasDto } from './dto/examenes.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

const MS_48H = 48 * 60 * 60 * 1000;

@Injectable()
export class ExamenesService {
  constructor(private readonly repo: ExamenesRepository) {}

  // ─── Mesas ───────────────────────────────────────────────────

  async createMesa(dto: CreateMesaDto, user: JwtPayload) {
    if (dto.fecha_limite_inscripcion && dto.fecha_limite_inscripcion > dto.fecha) {
      throw new BadRequestException(
        'fecha_limite_inscripcion no puede ser posterior a la fecha del examen',
      );
    }
    return this.repo.createMesa(user.inst, dto, user.sub);
  }

  getMesas(
    user: JwtPayload,
    opts: { ciclo_id?: string; materia_id?: string; estado?: string; curso_id?: string },
  ) {
    return this.repo.findMesas(user.inst, opts);
  }

  async getMesaById(id: string, user: JwtPayload) {
    const mesa = await this.repo.findMesaById(id, user.inst);
    if (!mesa) throw new NotFoundException('Mesa de examen no encontrada');
    return mesa;
  }

  // ─── Inscripción ─────────────────────────────────────────────

  async inscribir(mesaId: string, alumnoId: string, user: JwtPayload) {
    const mesa = await this.repo.findMesaById(mesaId, user.inst);
    if (!mesa) throw new NotFoundException('Mesa de examen no encontrada');

    if (mesa.estado !== 'abierta') {
      throw new BadRequestException('La mesa no está disponible para inscripción');
    }
    if (
      mesa.fecha_limite_inscripcion &&
      new Date() > new Date(mesa.fecha_limite_inscripcion + 'T23:59:59')
    ) {
      throw new BadRequestException('El período de inscripción ha vencido');
    }

    const yaInscripto = await this.repo.findInscripcion(mesaId, alumnoId);
    if (yaInscripto) {
      throw new ConflictException('El alumno ya está inscripto en esta mesa');
    }

    const inscriptos = await this.repo.countInscriptos(mesaId);
    if (inscriptos >= mesa.cupo_maximo) {
      throw new BadRequestException(
        `La mesa ha alcanzado el cupo máximo (${mesa.cupo_maximo} inscriptos)`,
      );
    }

    return this.repo.inscribir(mesaId, alumnoId, user.inst);
  }

  async desinscribir(inscripcionId: string, user: JwtPayload) {
    const inscripcion = await this.repo.findInscripcionById(inscripcionId, user.inst);
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    if (inscripcion.mesa_estado !== 'abierta') {
      throw new BadRequestException('No se puede anular: la mesa ya no está abierta');
    }

    const mesaDate = new Date(
      String(inscripcion.mesa_fecha).includes('T')
        ? inscripcion.mesa_fecha
        : inscripcion.mesa_fecha + 'T00:00:00',
    );
    if (Date.now() + MS_48H > mesaDate.getTime()) {
      throw new BadRequestException(
        'No se puede desinscribir: quedan menos de 48 horas para el examen',
      );
    }

    return this.repo.desinscribir(inscripcionId, user.inst);
  }

  // ─── Notas ───────────────────────────────────────────────────

  async cargarNotas(mesaId: string, dto: CargarNotasDto, user: JwtPayload) {
    const mesa = await this.repo.findMesaById(mesaId, user.inst);
    if (!mesa) throw new NotFoundException('Mesa de examen no encontrada');
    if (mesa.estado === 'cerrada') {
      throw new BadRequestException('El acta ya está cerrada; no se pueden modificar las notas');
    }
    if (mesa.estado === 'cancelada') {
      throw new BadRequestException('La mesa está cancelada');
    }
    return this.repo.cargarNotas(mesaId, user.inst, dto.items);
  }

  // ─── Cierre del acta ─────────────────────────────────────────

  async cerrarMesa(mesaId: string, user: JwtPayload) {
    const mesa = await this.repo.findMesaById(mesaId, user.inst);
    if (!mesa) throw new NotFoundException('Mesa de examen no encontrada');
    if (mesa.estado !== 'abierta') {
      throw new BadRequestException(`La mesa está en estado "${mesa.estado}"; no se puede cerrar`);
    }
    return this.repo.cerrarMesa(mesaId, user.inst);
  }

  // ─── PDF del acta ─────────────────────────────────────────────
  // Generado on-demand; no requiere almacenamiento previo.

  async generarActaPdf(mesaId: string, user: JwtPayload): Promise<Buffer> {
    const mesa = await this.repo.findMesaById(mesaId, user.inst);
    if (!mesa) throw new NotFoundException('Mesa de examen no encontrada');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const fmtDate = (v: unknown) => {
        if (!v) return '—';
        const s = String(v);
        const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
        return isNaN(d.getTime()) ? s : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      };

      // Encabezado
      doc.fontSize(18).font('Helvetica-Bold').text('Acta de Examen', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Materia: ${mesa.materia_nombre ?? '—'}`,  { continued: false });
      doc.text(`Fecha: ${fmtDate(mesa.fecha)}`);
      doc.text(`Aula: ${mesa.aula ?? '—'}`);
      doc.text(`Docente: ${mesa.docente_nombre ?? '—'}`);
      doc.text(`Estado: ${mesa.estado}`);
      doc.text(`Generado: ${fmtDate(new Date().toISOString())}`);
      doc.moveDown();

      // Tabla de inscriptos
      doc.fontSize(12).font('Helvetica-Bold').text('Inscriptos');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');

      const cols = { legajo: 50, apellido: 180, nombre: 130, estado: 80, nota: 60 };
      let y = doc.y;
      const drawHeader = () => {
        doc.font('Helvetica-Bold');
        doc.text('Legajo',   cols.legajo,  y, { width: 60 });
        doc.text('Apellido', 115,           y, { width: cols.apellido });
        doc.text('Nombre',   300,           y, { width: cols.nombre });
        doc.text('Estado',   430,           y, { width: cols.estado });
        doc.text('Nota',     505,           y, { width: cols.nota });
        doc.font('Helvetica');
        y += 16;
        doc.moveTo(50, y).lineTo(545, y).stroke();
        y += 4;
      };
      drawHeader();

      for (const insc of mesa.inscriptos ?? []) {
        if (y > 730) { doc.addPage(); y = 50; drawHeader(); }
        doc.text(insc.alumno_legajo  ?? '—', cols.legajo, y, { width: 60 });
        doc.text(insc.alumno_apellido ?? '—', 115,         y, { width: cols.apellido });
        doc.text(insc.alumno_nombre  ?? '—', 300,          y, { width: cols.nombre });
        doc.text(insc.estado          ?? '—', 430,          y, { width: cols.estado });
        doc.text(
          insc.nota_numerica != null ? String(insc.nota_numerica) : '—',
          505, y, { width: cols.nota },
        );
        y += 18;
      }

      doc.moveDown(3);
      doc.text('Firma del docente: ____________________________', { align: 'left' });

      doc.end();
    });
  }
}
