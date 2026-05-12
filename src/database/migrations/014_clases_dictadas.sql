-- ============================================================
-- SGE — Migración 014: Diario de clases (extiende planificacion)
-- ============================================================
-- No modifica ninguna tabla existente.
-- Agrega clases_dictadas vinculadas a planificaciones.

BEGIN;

CREATE TABLE IF NOT EXISTS clases_dictadas (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id   UUID         NOT NULL REFERENCES instituciones(id)  ON DELETE CASCADE,
  planificacion_id UUID         NOT NULL REFERENCES planificaciones(id) ON DELETE CASCADE,
  docente_id       UUID         REFERENCES legajos_docentes(id)         ON DELETE SET NULL,
  fecha            DATE         NOT NULL,
  contenidos_trabajados TEXT    NOT NULL,
  observaciones    TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clases_dictadas_planificacion
  ON clases_dictadas(planificacion_id);

CREATE INDEX IF NOT EXISTS idx_clases_dictadas_institucion_fecha
  ON clases_dictadas(institucion_id, fecha);

CREATE INDEX IF NOT EXISTS idx_clases_dictadas_docente
  ON clases_dictadas(docente_id);

CREATE TRIGGER trg_clases_dictadas_updated_at
  BEFORE UPDATE ON clases_dictadas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
