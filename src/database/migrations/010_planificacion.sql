-- Planificaciones curriculares: una por (materia, curso, ciclo_lectivo)
CREATE TABLE planificaciones (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id   UUID         NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  materia_id       UUID         NOT NULL REFERENCES materias(id)      ON DELETE CASCADE,
  curso_id         UUID         NOT NULL REFERENCES cursos(id)        ON DELETE CASCADE,
  ciclo_lectivo    SMALLINT     NOT NULL,
  docente_id       UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  estado           VARCHAR(20)  NOT NULL DEFAULT 'borrador'
                     CHECK (estado IN ('borrador', 'enviada', 'aprobada')),
  objetivos        TEXT,
  contenidos       JSONB        NOT NULL DEFAULT '[]',
  metodologia      TEXT,
  criterios_evaluacion TEXT,
  observaciones    TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (materia_id, curso_id, ciclo_lectivo)
);

CREATE INDEX idx_planificaciones_institucion ON planificaciones(institucion_id);
CREATE INDEX idx_planificaciones_materia     ON planificaciones(materia_id);
CREATE INDEX idx_planificaciones_curso       ON planificaciones(curso_id);
CREATE INDEX idx_planificaciones_ciclo       ON planificaciones(ciclo_lectivo);

CREATE TRIGGER trg_planificaciones_updated_at
  BEFORE UPDATE ON planificaciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
