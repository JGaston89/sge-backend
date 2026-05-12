import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

export interface AlertaAlumnoRow {
  alumno_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
  materias_evaluadas: number;
  total_notas: number;
  promedio_general: number | null;
  materias_desaprobadas: number;
  notas_bajo_minimo: number;
}

export interface AlertaAlumnoRowWithCurso extends AlertaAlumnoRow {
  curso_id: string;
  curso_nombre: string;
}

@Injectable()
export class AlertasRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async getAlertasByCurso(
    curso_id: string,
    ciclo_lectivo: number,
    institucion_id: string,
    periodo?: string,
  ): Promise<AlertaAlumnoRow[]> {
    const params: (string | number)[] = [curso_id, ciclo_lectivo, institucion_id];
    let periodoFilter = '';
    if (periodo) {
      params.push(periodo);
      periodoFilter = `AND a.periodo = $${params.length}`;
    }

    const { rows } = await this.pool.query<AlertaAlumnoRow>(
      `SELECT
         al.id                  AS alumno_id,
         al.nombre              AS alumno_nombre,
         al.apellido            AS alumno_apellido,
         al.numero_legajo       AS alumno_legajo,
         COUNT(DISTINCT a.materia_id)::int                                                                          AS materias_evaluadas,
         COUNT(cal.id) FILTER (WHERE cal.nota_numerica IS NOT NULL)::int                                            AS total_notas,
         ROUND(AVG(cal.nota_numerica) FILTER (WHERE cal.nota_numerica IS NOT NULL)::numeric, 2)                    AS promedio_general,
         COUNT(DISTINCT a.materia_id) FILTER (WHERE cal.nota_numerica IS NOT NULL AND cal.nota_numerica < 6)::int  AS materias_desaprobadas,
         COUNT(cal.id)          FILTER (WHERE cal.nota_numerica IS NOT NULL AND cal.nota_numerica < 6)::int        AS notas_bajo_minimo
       FROM inscripciones i
       JOIN alumnos al ON al.id = i.alumno_id
       LEFT JOIN actas a ON a.curso_id = i.curso_id
         AND a.anio_academico = i.ciclo_lectivo
         AND a.institucion_id = i.institucion_id
         ${periodoFilter}
       LEFT JOIN calificaciones cal ON cal.acta_id = a.id AND cal.alumno_id = i.alumno_id
       WHERE i.curso_id      = $1
         AND i.ciclo_lectivo = $2
         AND i.institucion_id = $3
         AND i.estado IN ('regular', 'libre')
       GROUP BY al.id, al.nombre, al.apellido, al.numero_legajo
       ORDER BY al.apellido, al.nombre`,
      params,
    );
    return rows;
  }

  async getCursoInstitucion(curso_id: string, institucion_id: string) {
    const { rows } = await this.pool.query<{ curso_nombre: string; institucion_nombre: string }>(
      `SELECT c.nombre AS curso_nombre, inst.nombre AS institucion_nombre
       FROM cursos c
       JOIN instituciones inst ON inst.id = c.institucion_id
       WHERE c.id = $1 AND c.institucion_id = $2`,
      [curso_id, institucion_id],
    );
    return rows[0] ?? { curso_nombre: '—', institucion_nombre: '—' };
  }

  async getAlertasByAlumno(
    alumno_id: string,
    ciclo_lectivo: number,
    institucion_id: string,
  ): Promise<AlertaAlumnoRowWithCurso[]> {
    const { rows } = await this.pool.query<AlertaAlumnoRowWithCurso>(
      `SELECT
         al.id                  AS alumno_id,
         al.nombre              AS alumno_nombre,
         al.apellido            AS alumno_apellido,
         al.numero_legajo       AS alumno_legajo,
         i.curso_id,
         c.nombre               AS curso_nombre,
         COUNT(DISTINCT a.materia_id)::int                                                                          AS materias_evaluadas,
         COUNT(cal.id) FILTER (WHERE cal.nota_numerica IS NOT NULL)::int                                            AS total_notas,
         ROUND(AVG(cal.nota_numerica) FILTER (WHERE cal.nota_numerica IS NOT NULL)::numeric, 2)                    AS promedio_general,
         COUNT(DISTINCT a.materia_id) FILTER (WHERE cal.nota_numerica IS NOT NULL AND cal.nota_numerica < 6)::int  AS materias_desaprobadas,
         COUNT(cal.id)          FILTER (WHERE cal.nota_numerica IS NOT NULL AND cal.nota_numerica < 6)::int        AS notas_bajo_minimo
       FROM inscripciones i
       JOIN alumnos al ON al.id = i.alumno_id
       JOIN cursos   c  ON c.id = i.curso_id
       LEFT JOIN actas a ON a.curso_id = i.curso_id
         AND a.anio_academico = i.ciclo_lectivo
         AND a.institucion_id = i.institucion_id
       LEFT JOIN calificaciones cal ON cal.acta_id = a.id AND cal.alumno_id = i.alumno_id
       WHERE i.alumno_id      = $1
         AND i.ciclo_lectivo  = $2
         AND i.institucion_id = $3
         AND i.estado IN ('regular', 'libre')
       GROUP BY al.id, al.nombre, al.apellido, al.numero_legajo, i.curso_id, c.nombre
       ORDER BY c.nombre`,
      [alumno_id, ciclo_lectivo, institucion_id],
    );
    return rows;
  }
}
