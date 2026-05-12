-- ============================================================
-- SGE — Migración 011: Legajos docentes y asignaciones
-- ============================================================

BEGIN;

-- ── Legajos docentes ─────────────────────────────────────────
-- Perfil profesional del docente. Puede vincularse a un usuario
-- del sistema (usuario_id) o existir de forma independiente.

CREATE TABLE IF NOT EXISTS legajos_docentes (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id    UUID         NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  usuario_id        UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  dni               VARCHAR(20),
  email             VARCHAR(255),
  telefono          VARCHAR(30),
  titulo            VARCHAR(200),
  especialidades    TEXT[]       NOT NULL DEFAULT '{}',
  fecha_ingreso     DATE,
  estado            VARCHAR(20)  NOT NULL DEFAULT 'activo'
                      CHECK (estado IN ('activo', 'inactivo', 'licencia')),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (institucion_id, dni)
);

CREATE INDEX idx_legajos_docentes_institucion ON legajos_docentes(institucion_id);
CREATE INDEX idx_legajos_docentes_usuario     ON legajos_docentes(usuario_id);
CREATE INDEX idx_legajos_docentes_estado      ON legajos_docentes(estado);

CREATE TRIGGER trg_legajos_docentes_updated_at
  BEFORE UPDATE ON legajos_docentes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Asignaciones ─────────────────────────────────────────────
-- Un docente puede estar asignado a varias materias/cursos
-- por ciclo lectivo.

CREATE TABLE IF NOT EXISTS asignaciones (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id    UUID         NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  docente_id        UUID         NOT NULL REFERENCES legajos_docentes(id) ON DELETE CASCADE,
  materia_id        UUID         NOT NULL REFERENCES materias(id)         ON DELETE CASCADE,
  curso_id          UUID         NOT NULL REFERENCES cursos(id)           ON DELETE CASCADE,
  ciclo_lectivo     SMALLINT     NOT NULL,
  horas_semanales   SMALLINT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (docente_id, materia_id, curso_id, ciclo_lectivo)
);

CREATE INDEX idx_asignaciones_institucion  ON asignaciones(institucion_id);
CREATE INDEX idx_asignaciones_docente      ON asignaciones(docente_id);
CREATE INDEX idx_asignaciones_materia      ON asignaciones(materia_id);
CREATE INDEX idx_asignaciones_curso        ON asignaciones(curso_id);
CREATE INDEX idx_asignaciones_ciclo        ON asignaciones(ciclo_lectivo);

COMMIT;
