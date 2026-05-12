-- ============================================================
-- SGE — Migración 009: Asistencias por materia
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS asistencias (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id  UUID        NOT NULL REFERENCES instituciones(id) ON DELETE RESTRICT,
  alumno_id       UUID        NOT NULL REFERENCES alumnos(id)       ON DELETE CASCADE,
  materia_id      UUID        NOT NULL REFERENCES materias(id)      ON DELETE RESTRICT,
  curso_id        UUID        NOT NULL REFERENCES cursos(id)        ON DELETE RESTRICT,
  ciclo_lectivo   SMALLINT    NOT NULL,
  fecha           DATE        NOT NULL,
  estado          VARCHAR(15) NOT NULL DEFAULT 'presente'
                  CHECK (estado IN ('presente','ausente','tardanza','justificado')),
  observaciones   TEXT,
  registrado_por  UUID        NOT NULL REFERENCES usuarios(id)      ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un alumno solo puede tener un registro por materia/curso/fecha
  UNIQUE (alumno_id, materia_id, curso_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_curso_materia_fecha
  ON asistencias(curso_id, materia_id, fecha);

CREATE INDEX IF NOT EXISTS idx_asistencias_alumno
  ON asistencias(alumno_id);

CREATE INDEX IF NOT EXISTS idx_asistencias_institucion_ciclo
  ON asistencias(institucion_id, ciclo_lectivo);

CREATE TRIGGER trg_asistencias_updated_at
  BEFORE UPDATE ON asistencias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
