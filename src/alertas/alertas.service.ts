import { Injectable } from '@nestjs/common';
import { AlertasRepository, AlertaAlumnoRow, AlertaAlumnoRowWithCurso } from './alertas.repository';
import { PdfService } from '../pdf/pdf.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

export type NivelRiesgo = 'alto' | 'medio' | 'bajo' | 'sin_datos';

function clasificar(row: AlertaAlumnoRow): { nivel: NivelRiesgo; motivos: string[] } {
  const { total_notas, promedio_general, materias_desaprobadas } = row;

  if (!total_notas || promedio_general === null) {
    return { nivel: 'sin_datos', motivos: ['Sin calificaciones registradas'] };
  }

  const motivos: string[] = [];

  if (promedio_general < 6) {
    motivos.push(`Promedio ${promedio_general} (mínimo aprobatorio: 6)`);
  }
  if (materias_desaprobadas >= 2) {
    motivos.push(`${materias_desaprobadas} materias con nota menor a 6`);
  } else if (materias_desaprobadas === 1) {
    motivos.push('1 materia con nota menor a 6');
  }
  if (promedio_general >= 6 && promedio_general < 7 && materias_desaprobadas === 0) {
    motivos.push(`Promedio ${promedio_general} (por debajo del óptimo: 7)`);
  }

  let nivel: NivelRiesgo;
  if (promedio_general < 6 || materias_desaprobadas >= 2) {
    nivel = 'alto';
  } else if (promedio_general < 7 || materias_desaprobadas >= 1) {
    nivel = 'medio';
  } else {
    nivel = 'bajo';
  }

  return { nivel, motivos };
}

@Injectable()
export class AlertasService {
  constructor(
    private readonly repo: AlertasRepository,
    private readonly pdfService: PdfService,
  ) {}

  async getAlertasByCurso(
    curso_id: string,
    ciclo_lectivo: number,
    user: JwtPayload,
    periodo?: string,
  ) {
    const rows = await this.repo.getAlertasByCurso(curso_id, ciclo_lectivo, user.inst, periodo);

    const alumnos = rows.map((r) => {
      const { nivel, motivos } = clasificar(r);
      return { ...r, nivel_riesgo: nivel, motivos };
    });

    const resumen = {
      total:     alumnos.length,
      alto:      alumnos.filter((a) => a.nivel_riesgo === 'alto').length,
      medio:     alumnos.filter((a) => a.nivel_riesgo === 'medio').length,
      bajo:      alumnos.filter((a) => a.nivel_riesgo === 'bajo').length,
      sin_datos: alumnos.filter((a) => a.nivel_riesgo === 'sin_datos').length,
    };

    return { resumen, alumnos };
  }

  async exportPdf(
    curso_id: string,
    ciclo_lectivo: number,
    user: JwtPayload,
    periodo?: string,
  ): Promise<Buffer> {
    const [meta, rows] = await Promise.all([
      this.repo.getCursoInstitucion(curso_id, user.inst),
      this.repo.getAlertasByCurso(curso_id, ciclo_lectivo, user.inst, periodo),
    ]);

    const alumnos = rows.map((r) => {
      const { nivel, motivos } = clasificar(r);
      return { ...r, nivel_riesgo: nivel, motivos };
    });

    const resumen = {
      total:     alumnos.length,
      alto:      alumnos.filter((a) => a.nivel_riesgo === 'alto').length,
      medio:     alumnos.filter((a) => a.nivel_riesgo === 'medio').length,
      bajo:      alumnos.filter((a) => a.nivel_riesgo === 'bajo').length,
      sin_datos: alumnos.filter((a) => a.nivel_riesgo === 'sin_datos').length,
    };

    return this.pdfService.generateAlertasPdf({
      curso_nombre:       meta.curso_nombre,
      institucion_nombre: meta.institucion_nombre,
      ciclo_lectivo,
      periodo,
      generado_at:        new Date(),
      resumen,
      alumnos,
    });
  }

  async getAlertasByAlumno(alumno_id: string, ciclo_lectivo: number, user: JwtPayload) {
    const rows = await this.repo.getAlertasByAlumno(alumno_id, ciclo_lectivo, user.inst);
    return rows.map((r) => {
      const { nivel, motivos } = clasificar(r);
      return { ...r, nivel_riesgo: nivel, motivos };
    });
  }
}
