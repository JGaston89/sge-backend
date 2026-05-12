-- ─────────────────────────────────────────────────────────────────
-- Migración 017 — Módulo Espacios Físicos
-- ─────────────────────────────────────────────────────────────────

-- Inventario de espacios físicos
CREATE TABLE IF NOT EXISTS espacios (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre         VARCHAR(150) NOT NULL,
  tipo           VARCHAR(15)  NOT NULL CHECK (tipo IN ('aula','laboratorio','sum','biblioteca','patio','otro')),
  capacidad      INT,
  equipamiento   JSONB        NOT NULL DEFAULT '[]',
  estado         VARCHAR(15)  NOT NULL CHECK (estado IN ('disponible','mantenimiento','inhabilitado')) DEFAULT 'disponible',
  piso           VARCHAR(20),
  descripcion    TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_espacios_inst ON espacios(institucion_id, estado);

-- Reservas de espacios con validación de solapamiento en la capa de servicio
CREATE TABLE IF NOT EXISTS espacios_reservas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id  UUID        NOT NULL REFERENCES instituciones(id),
  espacio_id      UUID        NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
  nombre_evento   VARCHAR(200),
  motivo          TEXT,
  fecha           DATE        NOT NULL,
  hora_inicio     TIME        NOT NULL,
  hora_fin        TIME        NOT NULL,
  estado          VARCHAR(15) NOT NULL CHECK (estado IN ('confirmada','cancelada')) DEFAULT 'confirmada',
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hora_coherente CHECK (hora_fin > hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_er_espacio_fecha ON espacios_reservas(espacio_id, fecha, estado);
CREATE INDEX IF NOT EXISTS idx_er_creador       ON espacios_reservas(created_by);

-- Solicitudes de mantenimiento por espacio o equipamiento general
CREATE TABLE IF NOT EXISTS espacios_mantenimiento (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id       UUID        NOT NULL REFERENCES instituciones(id),
  espacio_id           UUID        REFERENCES espacios(id),
  descripcion_problema TEXT        NOT NULL,
  descripcion_equipo   VARCHAR(200),
  prioridad            VARCHAR(5)  NOT NULL CHECK (prioridad IN ('baja','media','alta')) DEFAULT 'media',
  estado               VARCHAR(15) NOT NULL CHECK (estado IN ('pendiente','en_proceso','resuelto')) DEFAULT 'pendiente',
  reported_by          UUID,
  resolved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mant_espacio ON espacios_mantenimiento(espacio_id);
CREATE INDEX IF NOT EXISTS idx_mant_estado  ON espacios_mantenimiento(institucion_id, estado);
