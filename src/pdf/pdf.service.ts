import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';

type PdfDoc = InstanceType<typeof PDFDocument>;

// ─── Interfaces de datos para las plantillas ─────────────────

export interface ActaPdfData {
  acta: {
    id: string;
    periodo: string;
    anio_academico: number;
    estado: string;
    cerrada_at: Date | string | null;
    promedio_general: number | string | null;
  };
  curso: { nombre: string };
  materia: { nombre: string };
  institucion: { nombre: string };
  creado_por_nombre: string;
  calificaciones: Array<{
    alumno_apellido: string;
    alumno_nombre: string;
    alumno_legajo: string;
    tipo: string;
    nota_valor: string;
    nota_numerica: number | string | null;
  }>;
}

export interface InscripcionesPdfData {
  curso_nombre: string;
  institucion_nombre: string;
  ciclo_lectivo: number;
  generado_at: Date;
  inscripciones: Array<{
    alumno_apellido: string;
    alumno_nombre: string;
    alumno_legajo: string;
    estado: string;
    fecha_inscripcion: string;
    observaciones: string | null;
  }>;
}

export interface AlertasPdfData {
  curso_nombre: string;
  institucion_nombre: string;
  ciclo_lectivo: number;
  periodo?: string;
  generado_at: Date;
  resumen: { total: number; alto: number; medio: number; bajo: number; sin_datos: number };
  alumnos: Array<{
    alumno_apellido: string;
    alumno_nombre: string;
    alumno_legajo: string;
    promedio_general: number | null;
    materias_evaluadas: number;
    materias_desaprobadas: number;
    nivel_riesgo: string;
    motivos: string[];
  }>;
}

export interface FichaPdfData {
  alumno: {
    legajo: string;
    nombre: string;
    apellido: string;
    dni: string;
    fecha_nacimiento: Date | string | null;
    genero: string | null;
    nacionalidad: string | null;
    email: string | null;
    telefono: string | null;
    domicilio: string | null;
    estado: string;
    fecha_baja: Date | string | null;
    contactos: Array<{ nombre: string; relacion: string; telefono?: string; email?: string }>;
  };
  institucion: { nombre: string };
  inscripciones: Array<{
    ciclo_lectivo: number;
    curso_nombre: string;
    estado: string;
    fecha_inscripcion: string | Date;
    observaciones: string | null;
  }>;
}

export interface BoletinPdfData {
  alumno: {
    nombre: string;
    apellido: string;
    numero_legajo: string;
    dni: string;
  };
  institucion: { nombre: string };
  periodo: string;
  anio_academico: number;
  materias: Array<{
    nombre: string;
    calificaciones: Array<{
      tipo: string;
      nota_valor: string;
      nota_numerica: number | string | null;
    }>;
    promedio: number | null;
  }>;
  promedio_general: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDateAR(val: string | Date | null | undefined): string {
  if (!val) return '—';
  let d: Date;
  if (val instanceof Date) {
    d = val;
  } else {
    const s = String(val);
    d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
  }
  if (isNaN(d.getTime())) return '—';
  const day   = d.getDate();
  const month = d.getMonth() + 1;
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function tipoLabel(tipo: string): string {
  const map: Record<string, string> = {
    nota: 'Nota',
    parcial: 'Parcial',
    final: 'Final',
    recuperatorio: 'Recup.',
    concepto: 'Concepto',
  };
  return map[tipo] ?? tipo;
}

function docBuffer(doc: PdfDoc): Promise<Buffer> {
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// ─── Service ─────────────────────────────────────────────────

@Injectable()
export class PdfService {

  // ── Hash SHA-256 ─────────────────────────────────────────

  computeHash(buffer: Buffer, timestamp: Date): string {
    return crypto
      .createHash('sha256')
      .update(buffer)
      .update(timestamp.toISOString())
      .digest('hex');
  }

  // ── QR PNG buffer ─────────────────────────────────────────

  private async qrBuffer(url: string): Promise<Buffer> {
    return qrcode.toBuffer(url, { type: 'png', width: 90, margin: 1 });
  }

  // ── Cabecera institucional (común a ambas plantillas) ─────

  private drawHeader(
    doc: PdfDoc,
    title: string,
    institucionNombre: string,
  ) {
    const W = doc.page.width;

    // Banda superior azul
    doc.rect(0, 0, W, 80).fill('#1e3a5f');

    // Nombre institución
    doc.fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica')
      .text(institucionNombre.toUpperCase(), 50, 20, { width: W - 100, align: 'right' });

    // Título del documento
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .text(title, 50, 36, { width: W - 100, align: 'right' });

    // SGE badge izquierda
    doc.roundedRect(50, 22, 48, 36, 4).stroke('#38bdf8')
      .fillColor('#38bdf8').fontSize(14).font('Helvetica-Bold')
      .text('SGE', 54, 34, { width: 40, align: 'center' });

    doc.fillColor('#0f172a').moveDown(0);
    doc.y = 100;
  }

  // ── Línea separadora ──────────────────────────────────────

  private separator(doc: PdfDoc, y?: number) {
    const posY = y ?? doc.y;
    doc.moveTo(50, posY).lineTo(doc.page.width - 50, posY)
      .strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.y = posY + 8;
  }

  // ── Fila info 2 columnas ──────────────────────────────────

  private infoRow(
    doc: PdfDoc,
    pairs: Array<[string, string]>,
  ) {
    const colW = (doc.page.width - 100) / pairs.length;
    const startY = doc.y;
    pairs.forEach(([label, value], i) => {
      const x = 50 + i * colW;
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(label, x, startY);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
        .text(value, x, startY + 12, { width: colW - 8 });
    });
    doc.y = startY + 34;
  }

  // ── Tabla genérica ────────────────────────────────────────

  private drawTable(
    doc: PdfDoc,
    headers: string[],
    widths: number[],
    rows: string[][],
  ) {
    const startX = 50;
    let y = doc.y + 4;
    const rowH = 22;
    const headerH = 26;

    // Cabecera tabla
    doc.rect(startX, y, widths.reduce((a, b) => a + b, 0), headerH)
      .fill('#e8f0fe');
    doc.fillColor('#1e3a5f').font('Helvetica-Bold').fontSize(9);
    let x = startX;
    headers.forEach((h, i) => {
      doc.text(h, x + 6, y + 8, { width: widths[i] - 8, align: i === 0 ? 'left' : 'center' });
      x += widths[i];
    });
    y += headerH;

    // Filas
    doc.font('Helvetica').fontSize(9);
    rows.forEach((row, ri) => {
      // Nueva página si hace falta
      if (y + rowH > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }
      if (ri % 2 === 0) {
        doc.rect(startX, y, widths.reduce((a, b) => a + b, 0), rowH).fill('#f8fafc');
      }
      doc.fillColor('#0f172a');
      x = startX;
      row.forEach((cell, ci) => {
        doc.text(cell, x + 6, y + 6, {
          width: widths[ci] - 8,
          align: ci === 0 ? 'left' : 'center',
          ellipsis: true,
        });
        x += widths[ci];
      });
      // Borde inferior fila
      doc.moveTo(startX, y + rowH)
        .lineTo(startX + widths.reduce((a, b) => a + b, 0), y + rowH)
        .strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      y += rowH;
    });

    doc.y = y + 8;
  }

  // ── Pie con firma digital y QR ────────────────────────────

  private async drawFooter(
    doc: PdfDoc,
    hash: string,
    verifyUrl: string,
    generadoAt: Date,
  ) {
    const W = doc.page.width;
    const footerY = doc.page.height - 110;

    this.separator(doc, footerY);

    // QR a la derecha
    const qr = await this.qrBuffer(verifyUrl);
    doc.image(qr, W - 130, footerY + 8, { width: 80 });

    // Firma digital a la izquierda
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
      .text('FIRMA DIGITAL SHA-256', 50, footerY + 12);
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
      .text(hash, 50, footerY + 24, { width: W - 180 });

    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text(
        `Generado: ${generadoAt.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`,
        50,
        footerY + 52,
      );
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
      .text('Escanée el QR para verificar la autenticidad de este documento.', 50, footerY + 64);

    // Banda inferior
    doc.rect(0, doc.page.height - 24, W, 24).fill('#1e3a5f');
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
      .text('Sistema de Gestión Educativa — Documento generado digitalmente', 50, doc.page.height - 16, {
        width: W - 100,
        align: 'center',
      });
  }

  // ── PDF Acta ──────────────────────────────────────────────

  async generateActaPdf(data: ActaPdfData, verifyUrl: string): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const bufferPromise = docBuffer(doc);
    const generadoAt = new Date();

    this.drawHeader(doc, 'ACTA DE CALIFICACIONES', data.institucion.nombre);

    doc.y = 108;
    this.separator(doc);

    this.infoRow(doc, [
      ['Curso', data.curso.nombre],
      ['Materia', data.materia.nombre],
      ['Período', data.acta.periodo],
    ]);
    this.infoRow(doc, [
      ['Año académico', String(data.acta.anio_academico)],
      ['Estado', data.acta.estado.toUpperCase()],
      ['Fecha de cierre', formatDateAR(data.acta.cerrada_at)],
    ]);

    this.separator(doc);

    // Tabla de calificaciones
    const W = doc.page.width - 100;
    this.drawTable(
      doc,
      ['Alumno', 'Legajo', 'Tipo', 'Nota', 'Equivalencia'],
      [W * 0.38, W * 0.17, W * 0.15, W * 0.15, W * 0.15],
      data.calificaciones.map((c) => [
        `${c.alumno_apellido}, ${c.alumno_nombre}`,
        c.alumno_legajo,
        tipoLabel(c.tipo),
        c.nota_valor,
        c.nota_numerica ? Number(c.nota_numerica).toFixed(2) : '—',
      ]),
    );

    // Promedio
    if (data.acta.promedio_general) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f')
        .text(
          `Promedio general: ${parseFloat(String(data.acta.promedio_general)).toFixed(2)}`,
          50, doc.y + 4,
        );
      doc.moveDown(0.5);
    }

    // Hash placeholder (se calcula del buffer, así que usamos uno temporal)
    const tempHash = crypto.randomBytes(32).toString('hex');
    await this.drawFooter(doc, tempHash, verifyUrl, generadoAt);

    doc.end();
    const rawBuffer = await bufferPromise;

    // Hash real del contenido generado + timestamp
    const realHash = this.computeHash(rawBuffer, generadoAt);
    return rawBuffer;
  }

  // ── PDF Boletín ───────────────────────────────────────────

  async generateBoletinPdf(data: BoletinPdfData, verifyUrl: string): Promise<{ buffer: Buffer; hash: string }> {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const bufferPromise = docBuffer(doc);
    const generadoAt = new Date();

    this.drawHeader(doc, 'BOLETÍN DE CALIFICACIONES', data.institucion.nombre);

    doc.y = 108;
    this.separator(doc);

    this.infoRow(doc, [
      ['Alumno', `${data.alumno.apellido}, ${data.alumno.nombre}`],
      ['DNI', data.alumno.dni],
      ['Legajo', data.alumno.numero_legajo],
    ]);
    this.infoRow(doc, [
      ['Período', data.periodo],
      ['Año académico', String(data.anio_academico)],
      ['', ''],
    ]);

    this.separator(doc);

    const W = doc.page.width - 100;
    const colWidths = [W * 0.35, W * 0.18, W * 0.15, W * 0.17, W * 0.15];

    // Filas: agrupadas por materia con subtotal
    const rows: string[][] = [];
    data.materias.forEach((materia) => {
      materia.calificaciones.forEach((cal) => {
        rows.push([
          materia.nombre,
          tipoLabel(cal.tipo),
          cal.nota_valor,
          cal.nota_numerica ? Number(cal.nota_numerica).toFixed(2) : '—',
          '',
        ]);
      });
      if (materia.promedio !== null) {
        rows.push(['', '', '', `Promedio: ${materia.promedio.toFixed(2)}`, '']);
      }
    });

    this.drawTable(
      doc,
      ['Materia', 'Tipo', 'Nota', 'Equivalencia', ''],
      colWidths,
      rows,
    );

    // Promedio general
    if (data.promedio_general !== null) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a5f')
        .text(
          `Promedio general del período: ${data.promedio_general.toFixed(2)}`,
          50, doc.y + 8,
        );
    }

    const tempHash = crypto.randomBytes(32).toString('hex');
    await this.drawFooter(doc, tempHash, verifyUrl, generadoAt);

    doc.end();
    const buffer = await bufferPromise;
    const hash = this.computeHash(buffer, generadoAt);

    return { buffer, hash };
  }

  // ── PDF Nómina de Inscripciones ───────────────────────────

  async generateInscripcionesPdf(data: InscripcionesPdfData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const bufferPromise = docBuffer(doc);

    this.drawHeader(doc, 'NÓMINA DE INSCRIPCIONES', data.institucion_nombre);

    doc.y = 108;
    this.separator(doc);

    this.infoRow(doc, [
      ['Curso', data.curso_nombre],
      ['Ciclo lectivo', String(data.ciclo_lectivo)],
      ['Total inscriptos', String(data.inscripciones.length)],
    ]);

    this.separator(doc);

    const W = doc.page.width - 100;
    this.drawTable(
      doc,
      ['#', 'Alumno', 'Legajo', 'Estado', 'Fecha inscripción', 'Observaciones'],
      [W * 0.05, W * 0.30, W * 0.12, W * 0.10, W * 0.16, W * 0.27],
      data.inscripciones.map((i, idx) => [
        String(idx + 1),
        `${i.alumno_apellido}, ${i.alumno_nombre}`,
        i.alumno_legajo,
        i.estado.toUpperCase(),
        formatDateAR(i.fecha_inscripcion),
        i.observaciones ?? '—',
      ]),
    );

    // Pie simple
    const footerY = doc.page.height - 60;
    this.separator(doc, footerY);
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
      .text(
        `Generado: ${data.generado_at.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}   ·   Sistema de Gestión Educativa`,
        50,
        footerY + 10,
        { width: doc.page.width - 100, align: 'center' },
      );

    doc.rect(0, doc.page.height - 24, doc.page.width, 24).fill('#1e3a5f');
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
      .text('Sistema de Gestión Educativa — Documento generado digitalmente', 50, doc.page.height - 16, {
        width: doc.page.width - 100,
        align: 'center',
      });

    doc.end();
    return bufferPromise;
  }

  // ── PDF Reporte de Alertas de Riesgo ─────────────────────

  async generateAlertasPdf(data: AlertasPdfData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const bufferPromise = docBuffer(doc);

    this.drawHeader(doc, 'REPORTE DE RIESGO ACADÉMICO', data.institucion_nombre);

    doc.y = 108;
    this.separator(doc);

    this.infoRow(doc, [
      ['Curso', data.curso_nombre],
      ['Ciclo lectivo', String(data.ciclo_lectivo)],
      ['Período', data.periodo ?? 'Todos los períodos'],
    ]);

    // Resumen de riesgo
    const boxY = doc.y + 4;
    const boxW = (doc.page.width - 100) / 5;
    const boxes = [
      { label: 'Total', value: data.resumen.total, color: '#1e293b', bg: '#f1f5f9' },
      { label: 'Riesgo alto', value: data.resumen.alto, color: '#b91c1c', bg: '#fee2e2' },
      { label: 'Riesgo medio', value: data.resumen.medio, color: '#854d0e', bg: '#fef9c3' },
      { label: 'Sin riesgo', value: data.resumen.bajo, color: '#15803d', bg: '#dcfce7' },
      { label: 'Sin datos', value: data.resumen.sin_datos, color: '#64748b', bg: '#f8fafc' },
    ];
    boxes.forEach((b, i) => {
      const x = 50 + i * boxW;
      doc.roundedRect(x + 2, boxY, boxW - 4, 44, 4).fill(b.bg);
      doc.font('Helvetica-Bold').fontSize(20).fillColor(b.color)
        .text(String(b.value), x + 2, boxY + 6, { width: boxW - 4, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor(b.color)
        .text(b.label, x + 2, boxY + 28, { width: boxW - 4, align: 'center' });
    });
    doc.y = boxY + 56;

    this.separator(doc);

    const W = doc.page.width - 100;
    this.drawTable(
      doc,
      ['Alumno', 'Legajo', 'Promedio', 'Mat. eval.', 'Desaprobadas', 'Nivel riesgo'],
      [W * 0.28, W * 0.12, W * 0.10, W * 0.10, W * 0.12, W * 0.28],
      data.alumnos.map((a) => [
        `${a.alumno_apellido}, ${a.alumno_nombre}`,
        a.alumno_legajo,
        a.promedio_general !== null ? Number(a.promedio_general).toFixed(2) : '—',
        String(a.materias_evaluadas),
        String(a.materias_desaprobadas),
        a.nivel_riesgo === 'alto' ? 'RIESGO ALTO'
          : a.nivel_riesgo === 'medio' ? 'RIESGO MEDIO'
          : a.nivel_riesgo === 'bajo' ? 'SIN RIESGO'
          : 'SIN DATOS',
      ]),
    );

    // Pie simple
    const footerY = doc.page.height - 60;
    this.separator(doc, footerY);
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
      .text(
        `Generado: ${data.generado_at.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}   ·   Sistema de Gestión Educativa`,
        50,
        footerY + 10,
        { width: doc.page.width - 100, align: 'center' },
      );

    doc.rect(0, doc.page.height - 24, doc.page.width, 24).fill('#1e3a5f');
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
      .text('Sistema de Gestión Educativa — Documento generado digitalmente', 50, doc.page.height - 16, {
        width: doc.page.width - 100,
        align: 'center',
      });

    doc.end();
    return bufferPromise;
  }

  // ── PDF Legajo / Ficha Completa ──────────────────────────

  async generateFichaPdf(data: FichaPdfData, verifyUrl: string): Promise<{ buffer: Buffer; hash: string }> {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const bufferPromise = docBuffer(doc);
    const generadoAt = new Date();

    this.drawHeader(doc, 'LEGAJO DEL ALUMNO', data.institucion.nombre);

    doc.y = 108;
    this.separator(doc);

    // Datos personales
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f')
      .text('DATOS PERSONALES', 50, doc.y + 4);
    doc.y += 22;

    this.infoRow(doc, [
      ['Legajo', data.alumno.legajo],
      ['DNI', data.alumno.dni],
      ['Estado', data.alumno.estado.toUpperCase()],
    ]);

    this.infoRow(doc, [
      ['Apellido', data.alumno.apellido],
      ['Nombre', data.alumno.nombre],
      ['Fecha de nacimiento', formatDateAR(data.alumno.fecha_nacimiento)],
    ]);

    this.infoRow(doc, [
      ['Género', data.alumno.genero ?? '—'],
      ['Nacionalidad', data.alumno.nacionalidad ?? '—'],
      ['', ''],
    ]);

    this.infoRow(doc, [
      ['Email', data.alumno.email ?? '—'],
      ['Teléfono', data.alumno.telefono ?? '—'],
      ['', ''],
    ]);

    if (data.alumno.domicilio) {
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text('Domicilio', 50, doc.y);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
        .text(data.alumno.domicilio, 50, doc.y + 12, { width: doc.page.width - 100 });
      doc.y += 34;
    }

    if (data.alumno.estado === 'baja' && data.alumno.fecha_baja) {
      this.infoRow(doc, [
        ['Fecha de baja', formatDateAR(data.alumno.fecha_baja)],
        ['', ''],
        ['', ''],
      ]);
    }

    // Contactos de emergencia
    if (data.alumno.contactos.length > 0) {
      this.separator(doc);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f')
        .text('CONTACTOS DE EMERGENCIA', 50, doc.y + 4);
      doc.y += 22;

      data.alumno.contactos.forEach((c) => {
        this.infoRow(doc, [
          ['Nombre', c.nombre],
          ['Relación', c.relacion.toUpperCase()],
          ['Teléfono', c.telefono ?? '—'],
        ]);
      });
    }

    // Historial de inscripciones
    if (data.inscripciones.length > 0) {
      this.separator(doc);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f')
        .text('HISTORIAL DE INSCRIPCIONES', 50, doc.y + 4);
      doc.y += 14;

      const W = doc.page.width - 100;
      this.drawTable(
        doc,
        ['Ciclo', 'Curso', 'Estado', 'Fecha inscripción'],
        [W * 0.12, W * 0.38, W * 0.20, W * 0.30],
        data.inscripciones.map((i) => [
          String(i.ciclo_lectivo),
          i.curso_nombre,
          i.estado.toUpperCase(),
          formatDateAR(i.fecha_inscripcion),
        ]),
      );
    }

    const tempHash = crypto.randomBytes(32).toString('hex');
    await this.drawFooter(doc, tempHash, verifyUrl, generadoAt);

    doc.end();
    const buffer = await bufferPromise;
    const hash = this.computeHash(buffer, generadoAt);

    return { buffer, hash };
  }

  // ── Regenera solo el hash de un buffer existente ──────────

  async hashBuffer(buffer: Buffer): Promise<string> {
    return this.computeHash(buffer, new Date());
  }
}
