import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PlanificacionRepository } from './planificacion.repository';
import type { CreatePlanificacionDto, UpdatePlanificacionDto } from './dto/planificacion.dto';
import type { CreateClaseDictadaDto } from './dto/clase-dictada.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class PlanificacionService {
  constructor(private readonly repo: PlanificacionRepository) {}

  findAll(user: JwtPayload, filters: { ciclo_lectivo?: number; curso_id?: string; materia_id?: string; estado?: string }) {
    return this.repo.findAll(user.inst, filters);
  }

  findOne(id: string, user: JwtPayload) {
    return this.repo.findOne(id, user.inst);
  }

  create(dto: CreatePlanificacionDto, user: JwtPayload) {
    return this.repo.create(user.inst, dto);
  }

  update(id: string, dto: UpdatePlanificacionDto, user: JwtPayload) {
    return this.repo.update(id, user.inst, dto);
  }

  remove(id: string, user: JwtPayload) {
    return this.repo.remove(id, user.inst);
  }

  // ─── Nuevas funcionalidades Sprint 12 ────────────────────────

  aprobar(id: string, user: JwtPayload) {
    return this.repo.aprobar(id, user.inst);
  }

  getAvance(
    user: JwtPayload,
    opts: { materia_id?: string; ciclo_lectivo?: number },
  ) {
    return this.repo.getAvance(user.inst, opts);
  }

  createClaseDictada(dto: CreateClaseDictadaDto, user: JwtPayload) {
    return this.repo.createClaseDictada(user.inst, dto);
  }

  getClasesDictadas(planificacionId: string, user: JwtPayload) {
    return this.repo.findClasesDictadas(planificacionId, user.inst);
  }

  async exportarPdf(id: string, user: JwtPayload): Promise<Buffer> {
    const { plan, clases } = await this.repo.getPdfData(id, user.inst);

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
      doc.fontSize(18).font('Helvetica-Bold').text('Planificación Curricular', { align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Materia: ${(plan as any).materia_nombre ?? '—'}`);
      doc.text(`Curso: ${(plan as any).curso_nombre ?? '—'}`);
      doc.text(`Ciclo lectivo: ${plan.ciclo_lectivo}`);
      doc.text(`Estado: ${plan.estado}`);
      doc.text(`Docente: ${(plan as any).docente_nombre ?? '—'}`);
      doc.moveDown();

      // Objetivos
      if (plan.objetivos) {
        doc.fontSize(12).font('Helvetica-Bold').text('Objetivos');
        doc.fontSize(10).font('Helvetica').text(plan.objetivos);
        doc.moveDown();
      }

      // Contenidos planificados
      const contenidos: { titulo: string; descripcion?: string }[] = plan.contenidos ?? [];
      if (contenidos.length) {
        doc.fontSize(12).font('Helvetica-Bold').text('Contenidos planificados');
        doc.fontSize(10).font('Helvetica');
        contenidos.forEach((u, i) => {
          doc.text(`${i + 1}. ${u.titulo}${u.descripcion ? ': ' + u.descripcion : ''}`);
        });
        doc.moveDown();
      }

      // Clases dictadas
      if (clases.length) {
        doc.fontSize(12).font('Helvetica-Bold').text('Diario de clases');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        for (const c of clases) {
          doc.font('Helvetica-Bold').text(fmtDate(c.fecha), { continued: true });
          doc.font('Helvetica').text(`  ${c.contenidos_trabajados}`);
          if (c.observaciones) doc.text(`   ↳ ${c.observaciones}`, { indent: 12 });
        }
        doc.moveDown();
      }

      // Avance
      const pct = contenidos.length
        ? Math.round((clases.length / contenidos.length) * 100)
        : 0;
      doc.fontSize(11).font('Helvetica-Bold')
        .text(`Avance del programa: ${clases.length}/${contenidos.length} unidades (${pct}%)`);

      doc.end();
    });
  }
}
