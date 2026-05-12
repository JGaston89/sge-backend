-- ============================================================
-- SGE — Migración 002: Módulo de alumnos y legajos
-- ============================================================

BEGIN;

-- ─── Secuencias de legajos por institución/año ───────────────
-- Permite generar números AAAA-NNNNN atómicos sin race conditions
CREATE TABLE IF NOT EXISTS legajo_secuencias (
  institucion_id UUID     NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  anio           SMALLINT NOT NULL,
  ultimo_numero  INTEGER  NOT NULL DEFAULT 0,
  PRIMARY KEY (institucion_id, anio)
);

-- ─── Alumnos ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alumnos (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id   UUID         NOT NULL REFERENCES instituciones(id) ON DELETE RESTRICT,
  numero_legajo    VARCHAR(20)  NOT NULL,

  -- Datos personales
  dni              VARCHAR(20)  NOT NULL,
  nombre           VARCHAR(100) NOT NULL,
  apellido         VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE,
  genero           VARCHAR(20)  CHECK (genero IN ('masculino','femenino','otro','no_especificado')),
  nacionalidad     VARCHAR(60),

  -- Contacto del alumno
  email            VARCHAR(255),
  telefono         VARCHAR(30),
  domicilio        TEXT,

  -- Tutores / contactos de emergencia (array de objetos JSON)
  contactos        JSONB        NOT NULL DEFAULT '[]',

  -- Estado
  estado           VARCHAR(20)  NOT NULL DEFAULT 'activo'
                   CHECK (estado IN ('activo','baja','egresado')),
  fecha_baja       DATE,
  motivo_baja      TEXT,

  -- Búsqueda full-text
  search_vector    tsvector,

  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (institucion_id, dni),
  UNIQUE (institucion_id, numero_legajo)
);

-- ─── Índices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_alumnos_institucion   ON alumnos(institucion_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_estado        ON alumnos(institucion_id, estado);
CREATE INDEX IF NOT EXISTS idx_alumnos_dni           ON alumnos(institucion_id, dni);
-- Índice compuesto para cursor-based pagination (ORDER BY created_at DESC, id DESC)
CREATE INDEX IF NOT EXISTS idx_alumnos_cursor        ON alumnos(institucion_id, created_at DESC, id DESC);
-- GIN para búsqueda full-text
CREATE INDEX IF NOT EXISTS idx_alumnos_search_vector ON alumnos USING gin(search_vector);

-- ─── Trigger: search_vector ──────────────────────────────────
CREATE OR REPLACE FUNCTION alumnos_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', COALESCE(NEW.apellido, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.nombre,   '')), 'A') ||
    setweight(to_tsvector('simple',  COALESCE(NEW.dni,       '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Solo se dispara cuando cambian los campos relevantes para búsqueda
CREATE TRIGGER trg_alumnos_search_vector
  BEFORE INSERT OR UPDATE OF nombre, apellido, dni ON alumnos
  FOR EACH ROW EXECUTE FUNCTION alumnos_update_search_vector();

-- Reutiliza set_updated_at() creado en 001_auth.sql
CREATE TRIGGER trg_alumnos_updated_at
  BEFORE UPDATE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
