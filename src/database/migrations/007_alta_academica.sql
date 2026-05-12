-- ============================================================
-- 007_alta_academica.sql
-- Tablas de configuración académica: periodos y ciclos_lectivos
-- (cursos y materias ya existen desde 003_calificaciones.sql)
-- ============================================================

-- ─── Periodos ────────────────────────────────────────────────
-- Ej: "1er trimestre", "2do cuatrimestre", "Anual"
CREATE TABLE IF NOT EXISTS periodos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID         NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre         VARCHAR(60)  NOT NULL,
  activo         BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (institucion_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_periodos_institucion ON periodos (institucion_id);

-- ─── Ciclos Lectivos ─────────────────────────────────────────
-- Ej: anio=2026, nombre="2026" (o "2026-A" si hay ciclos partidos)
CREATE TABLE IF NOT EXISTS ciclos_lectivos (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID         NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  anio           SMALLINT     NOT NULL,
  nombre         VARCHAR(40)  NOT NULL,
  activo         BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (institucion_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_ciclos_lectivos_institucion ON ciclos_lectivos (institucion_id);
