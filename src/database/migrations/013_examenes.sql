-- ============================================================
-- SGE — Migración 013: Mesas de examen e inscripciones
-- ============================================================

BEGIN;

-- ── Mesas de examen ──────────────────────────────────────────
-- Una mesa es una instancia de examen para una materia,
-- con fecha, aula, docente y cupo configurable.

CREATE TABLE IF NOT EXISTS mesas_examen (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id           UUID         NOT NULL REFERENCES instituciones(id)      ON DELETE CASCADE,
  ciclo_id                 UUID         REFERENCES ciclos_lectivos(id)             ON DELETE SET NULL,
  materia_id               UUID         NOT NULL REFERENCES materias(id)           ON DELETE RESTRICT,
  docente_id               UUID         REFERENCES legajos_docentes(id)            ON DELETE SET NULL,
  fecha                    DATE         NOT NULL,
  hora                     TIME,
  aula                     VARCHAR(50),
  cupo_maximo              INTEGER      NOT NULL DEFAULT 30
                           CHECK (cupo_maximo > 0),
  estado                   VARCHAR(20)  NOT NULL DEFAULT 'abierta'
                           CHECK (estado IN ('abierta', 'cerrada', 'cancelada')),
  fecha_limite_inscripcion DATE,
  pdf_acta_url             TEXT,
  created_by               UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_mesa_limite CHECK (
    fecha_limite_inscripcion IS NULL OR fecha_limite_inscripcion <= fecha
  )
);

CREATE INDEX IF NOT EXISTS idx_mesas_examen_institucion
  ON mesas_examen(institucion_id);

CREATE INDEX IF NOT EXISTS idx_mesas_examen_materia
  ON mesas_examen(materia_id);

CREATE INDEX IF NOT EXISTS idx_mesas_examen_ciclo
  ON mesas_examen(ciclo_id);

CREATE INDEX IF NOT EXISTS idx_mesas_examen_fecha
  ON mesas_examen(institucion_id, fecha);

CREATE INDEX IF NOT EXISTS idx_mesas_examen_estado
  ON mesas_examen(institucion_id, estado);

CREATE TRIGGER trg_mesas_examen_updated_at
  BEFORE UPDATE ON mesas_examen
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Inscripciones a mesas de examen ──────────────────────────
-- Registro de cada alumno inscripto a una mesa.
-- La nota y estado final se cargan en el cierre del acta.

CREATE TABLE IF NOT EXISTS inscripciones_examen (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id   UUID         NOT NULL REFERENCES instituciones(id)  ON DELETE CASCADE,
  mesa_id          UUID         NOT NULL REFERENCES mesas_examen(id)   ON DELETE CASCADE,
  alumno_id        UUID         NOT NULL REFERENCES alumnos(id)        ON DELETE CASCADE,
  estado           VARCHAR(20)  NOT NULL DEFAULT 'inscripto'
                   CHECK (estado IN ('inscripto', 'presente', 'ausente', 'anulada')),
  nota_numerica    NUMERIC(4,2) CHECK (nota_numerica BETWEEN 1 AND 10),
  nota_conceptual  VARCHAR(20)  CHECK (nota_conceptual IN ('aprobado', 'desaprobado')),
  observaciones    TEXT,
  fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (mesa_id, alumno_id)
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_examen_mesa
  ON inscripciones_examen(mesa_id);

CREATE INDEX IF NOT EXISTS idx_inscripciones_examen_alumno
  ON inscripciones_examen(alumno_id);

CREATE INDEX IF NOT EXISTS idx_inscripciones_examen_institucion
  ON inscripciones_examen(institucion_id);

CREATE TRIGGER trg_inscripciones_examen_updated_at
  BEFORE UPDATE ON inscripciones_examen
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
