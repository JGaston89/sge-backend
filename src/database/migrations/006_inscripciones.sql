-- ============================================================
-- SGE — Migración 006: Inscripciones de alumnos a cursos
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS inscripciones (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id    UUID        NOT NULL REFERENCES instituciones(id) ON DELETE RESTRICT,
  alumno_id         UUID        NOT NULL REFERENCES alumnos(id)       ON DELETE CASCADE,
  curso_id          UUID        NOT NULL REFERENCES cursos(id)        ON DELETE RESTRICT,
  ciclo_lectivo     SMALLINT    NOT NULL,
  estado            VARCHAR(20) NOT NULL DEFAULT 'regular'
                    CHECK (estado IN ('regular','libre','baja')),
  fecha_inscripcion DATE        NOT NULL DEFAULT CURRENT_DATE,
  observaciones     TEXT,
  creado_por        UUID        NOT NULL REFERENCES usuarios(id)      ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un alumno no puede estar inscripto dos veces en el mismo curso y ciclo
  UNIQUE (alumno_id, curso_id, ciclo_lectivo)
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno
  ON inscripciones(alumno_id);

CREATE INDEX IF NOT EXISTS idx_inscripciones_curso_ciclo
  ON inscripciones(curso_id, ciclo_lectivo);

CREATE INDEX IF NOT EXISTS idx_inscripciones_institucion
  ON inscripciones(institucion_id, ciclo_lectivo);

CREATE TRIGGER trg_inscripciones_updated_at
  BEFORE UPDATE ON inscripciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
