export interface CreateDocenteDto {
  usuario_id?: string;
  nombre: string;
  apellido: string;
  dni?: string;
  email?: string;
  telefono?: string;
  titulo?: string;
  especialidades?: string[];
  fecha_ingreso?: string;
  observaciones?: string;
}

export interface UpdateDocenteDto {
  usuario_id?: string | null;
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string;
  telefono?: string;
  titulo?: string;
  especialidades?: string[];
  fecha_ingreso?: string | null;
  estado?: 'activo' | 'inactivo' | 'licencia';
  observaciones?: string;
}

export interface CreateAsignacionDto {
  docente_id: string;
  materia_id: string;
  curso_id: string;
  ciclo_lectivo: number;
  horas_semanales?: number;
}

export interface UpdateAsignacionDto {
  horas_semanales?: number;
}
