-- ─────────────────────────────────────────────────────────────────
-- Migración 031 — Tutores / responsables del alumno
-- Diseño normalizado: un tutor existe una sola vez aunque tenga
-- múltiples hijos en la institución (evita duplicados de datos).
-- La relación con cada alumno vive en alumno_tutores.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tutores (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  tipo_documento    VARCHAR(20)  NOT NULL DEFAULT 'DNI'
                      CHECK (tipo_documento IN ('DNI','CI','Pasaporte','Otro')),
  numero_documento  VARCHAR(20)  NOT NULL,
  email             VARCHAR(255),
  telefono          VARCHAR(30),
  telefono_laboral  VARCHAR(30),
  domicilio_calle   VARCHAR(200),
  domicilio_numero  VARCHAR(20),
  domicilio_piso    VARCHAR(10),
  domicilio_torre   VARCHAR(20),
  domicilio_depto   VARCHAR(20),
  localidad         VARCHAR(100),
  provincia         VARCHAR(100),
  codigo_postal     VARCHAR(10),
  pais              VARCHAR(60)  NOT NULL DEFAULT 'Argentina',
  nacionalidad      VARCHAR(60),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Un documento identifica unívocamente a una persona
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutores_documento
  ON tutores(tipo_documento, numero_documento);

CREATE INDEX IF NOT EXISTS idx_tutores_apellido
  ON tutores(apellido, nombre);

-- Tabla relacional: un tutor puede estar vinculado a N alumnos
CREATE TABLE IF NOT EXISTS alumno_tutores (
  id                       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  alumno_id                UUID        NOT NULL REFERENCES alumnos(id)  ON DELETE CASCADE,
  tutor_id                 UUID        NOT NULL REFERENCES tutores(id)  ON DELETE RESTRICT,
  relacion                 VARCHAR(30) NOT NULL DEFAULT 'tutor'
                             CHECK (relacion IN ('padre','madre','abuelo','abuela','tio','tia','tutor_legal','hermano','hermana','otro')),
  es_contacto_emergencia   BOOLEAN     NOT NULL DEFAULT false,
  es_responsable_economico BOOLEAN     NOT NULL DEFAULT false,
  vive_con_alumno          BOOLEAN     NOT NULL DEFAULT false,
  orden                    SMALLINT    NOT NULL DEFAULT 1,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(alumno_id, tutor_id)
);

CREATE INDEX IF NOT EXISTS idx_alumno_tutores_alumno
  ON alumno_tutores(alumno_id);

CREATE INDEX IF NOT EXISTS idx_alumno_tutores_tutor
  ON alumno_tutores(tutor_id);

CREATE TRIGGER trg_tutores_updated_at
  BEFORE UPDATE ON tutores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
