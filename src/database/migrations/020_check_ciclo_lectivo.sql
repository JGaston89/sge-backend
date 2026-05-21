-- ─────────────────────────────────────────────────────────────────
-- Migración 020 — Restricciones ciclo_lectivo / anio_academico
--                 + índice planificaciones + FKs created_by
-- ─────────────────────────────────────────────────────────────────

-- ── CHECK constraints — ciclo_lectivo / anio_academico ─────────────

ALTER TABLE asistencias
  ADD CONSTRAINT chk_asistencias_ciclo_rango
  CHECK (ciclo_lectivo BETWEEN 2000 AND 2100);

ALTER TABLE inscripciones
  ADD CONSTRAINT chk_inscripciones_ciclo_rango
  CHECK (ciclo_lectivo BETWEEN 2000 AND 2100);

ALTER TABLE planificaciones
  ADD CONSTRAINT chk_planificaciones_ciclo_rango
  CHECK (ciclo_lectivo BETWEEN 2000 AND 2100);

ALTER TABLE actas
  ADD CONSTRAINT chk_actas_anio_rango
  CHECK (anio_academico BETWEEN 2000 AND 2100);

ALTER TABLE cursos
  ADD CONSTRAINT chk_cursos_anio_rango
  CHECK (anio_academico BETWEEN 2000 AND 2100);

-- ── Índice — planificaciones.docente_id ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_planificaciones_docente
  ON planificaciones(docente_id);

-- ── FKs created_by / reported_by → usuarios (ON DELETE SET NULL) ──

ALTER TABLE espacios
  ADD CONSTRAINT fk_espacios_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE espacios_reservas
  ADD CONSTRAINT fk_espacios_reservas_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE espacios_mantenimiento
  ADD CONSTRAINT fk_espacios_mant_reported_by
  FOREIGN KEY (reported_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE biblioteca_materiales_estudio
  ADD CONSTRAINT fk_bme_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE biblioteca_archivos
  ADD CONSTRAINT fk_ba_created_by
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;
