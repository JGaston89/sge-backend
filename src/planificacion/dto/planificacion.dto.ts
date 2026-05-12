export interface UnidadTematicaDto {
  titulo: string;
  descripcion?: string;
}

export interface CreatePlanificacionDto {
  materia_id: string;
  curso_id: string;
  ciclo_lectivo: number;
  docente_id?: string;
  objetivos?: string;
  contenidos?: UnidadTematicaDto[];
  metodologia?: string;
  criterios_evaluacion?: string;
  observaciones?: string;
}

export interface UpdatePlanificacionDto {
  estado?: 'borrador' | 'enviada' | 'aprobada';
  docente_id?: string;
  objetivos?: string;
  contenidos?: UnidadTematicaDto[];
  metodologia?: string;
  criterios_evaluacion?: string;
  observaciones?: string;
}
