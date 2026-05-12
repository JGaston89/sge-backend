-- ============================================================
-- SGE — Migración 003: Módulo de calificaciones y actas
-- ============================================================

BEGIN;

-- ─── Materias ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materias (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID         NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre         VARCHAR(100) NOT NULL,
  codigo         VARCHAR(20),
  activo         BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (institucion_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_materias_institucion ON materias(institucion_id);

-- ─── Cursos (secciones / grupos) ─────────────────────────────
CREATE TABLE IF NOT EXISTS cursos (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID        NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre         VARCHAR(50) NOT NULL,
  anio_academico SMALLINT    NOT NULL,
  nivel          VARCHAR(30) CHECK (nivel IN ('inicial','primaria','secundaria','terciario')),
  turno          VARCHAR(20) CHECK (turno IN ('manana','tarde','noche','vespertino')),
  activo         BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institucion_id, nombre, anio_academico)
);

CREATE INDEX IF NOT EXISTS idx_cursos_institucion ON cursos(institucion_id);

-- ─── Relación curso ↔ alumno ──────────────────────────────────
CREATE TABLE IF NOT EXISTS curso_alumnos (
  curso_id          UUID NOT NULL REFERENCES cursos(id)  ON DELETE CASCADE,
  alumno_id         UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  fecha_inscripcion DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (curso_id, alumno_id)
);

CREATE INDEX IF NOT EXISTS idx_curso_alumnos_alumno ON curso_alumnos(alumno_id);

-- ─── Actas ───────────────────────────────────────────────────
-- Contenedor por curso + materia + período. Estado: borrador → cerrada.
CREATE TABLE IF NOT EXISTS actas (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID        NOT NULL REFERENCES instituciones(id) ON DELETE RESTRICT,
  curso_id       UUID        NOT NULL REFERENCES cursos(id)        ON DELETE RESTRICT,
  materia_id     UUID        NOT NULL REFERENCES materias(id)      ON DELETE RESTRICT,
  periodo        VARCHAR(50) NOT NULL,
  anio_academico SMALLINT    NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'borrador'
                 CHECK (estado IN ('borrador','cerrada')),
  cerrada_por    UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  cerrada_at     TIMESTAMPTZ,
  creado_por     UUID        NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (curso_id, materia_id, periodo, anio_academico)
);

CREATE INDEX IF NOT EXISTS idx_actas_institucion ON actas(institucion_id);
CREATE INDEX IF NOT EXISTS idx_actas_curso       ON actas(curso_id);
CREATE INDEX IF NOT EXISTS idx_actas_materia     ON actas(materia_id);

-- ─── Calificaciones ──────────────────────────────────────────
-- Una fila por alumno + tipo dentro del acta.
-- nota_valor: valor raw ("7", "MB", "A"). nota_numerica: calculado para promedios.
CREATE TABLE IF NOT EXISTS calificaciones (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  acta_id       UUID        NOT NULL REFERENCES actas(id)    ON DELETE RESTRICT,
  alumno_id     UUID        NOT NULL REFERENCES alumnos(id)  ON DELETE RESTRICT,
  tipo          VARCHAR(30) NOT NULL DEFAULT 'nota'
                CHECK (tipo IN ('nota','parcial','final','recuperatorio','concepto')),
  nota_valor    VARCHAR(10) NOT NULL,
  nota_numerica NUMERIC(5,2),
  observaciones TEXT,
  cargado_por   UUID        NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (acta_id, alumno_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_calificaciones_acta   ON calificaciones(acta_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_alumno ON calificaciones(alumno_id);

-- ─── Triggers updated_at ─────────────────────────────────────
CREATE TRIGGER trg_actas_updated_at
  BEFORE UPDATE ON actas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_calificaciones_updated_at
  BEFORE UPDATE ON calificaciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
