-- ─────────────────────────────────────────────────────────────────
-- Migración 019 — Unicidad de inscripción activa por alumno y ciclo
-- Garantiza que un alumno no puede tener más de una inscripción
-- activa (estado != 'baja') en el mismo ciclo lectivo.
-- ─────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uniq_inscripcion_activa
  ON inscripciones (alumno_id, ciclo_lectivo)
  WHERE estado != 'baja';
