-- ============================================================
-- SGE — Migración 012: Ciclos lectivos y calendario de eventos
-- ============================================================

BEGIN;

-- ── Ciclos lectivos ──────────────────────────────────────────
-- Representa el año académico formal de una institución.
-- NOTA: las tablas existentes (asistencias, planificaciones, etc.)
-- usan ciclo_lectivo SMALLINT y no referencian esta tabla.
-- Esta entidad es aditiva y no modifica ninguna tabla existente.

CREATE TABLE IF NOT EXISTS ciclos_lectivos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID         NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre          VARCHAR(100) NOT NULL,
  anio            SMALLINT     NOT NULL,
  fecha_inicio    DATE         NOT NULL,
  fecha_fin       DATE         NOT NULL,
  activo          BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_ciclo_fechas CHECK (fecha_fin > fecha_inicio),
  UNIQUE (institucion_id, anio)
);

CREATE INDEX IF NOT EXISTS idx_ciclos_lectivos_institucion
  ON ciclos_lectivos(institucion_id);

CREATE INDEX IF NOT EXISTS idx_ciclos_lectivos_activo
  ON ciclos_lectivos(institucion_id, activo);

CREATE TRIGGER trg_ciclos_lectivos_updated_at
  BEFORE UPDATE ON ciclos_lectivos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Eventos del calendario académico ─────────────────────────

CREATE TABLE IF NOT EXISTS calendario_eventos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID         NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  ciclo_id        UUID         REFERENCES ciclos_lectivos(id) ON DELETE SET NULL,
  titulo          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  tipo            VARCHAR(50)  NOT NULL
                  CHECK (tipo IN (
                    'feriado_nacional',
                    'feriado_provincial',
                    'feriado_institucional',
                    'inicio_clases',
                    'fin_clases',
                    'receso_invernal',
                    'receso_primavera',
                    'reunion_padres',
                    'acto_escolar',
                    'jornada_institucional',
                    'periodo_examenes',
                    'entrega_boletines',
                    'otro'
                  )),
  fecha_inicio    DATE         NOT NULL,
  fecha_fin       DATE,
  todo_el_dia     BOOLEAN      NOT NULL DEFAULT true,
  created_by      UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_evento_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_calendario_eventos_institucion_rango
  ON calendario_eventos(institucion_id, fecha_inicio, fecha_fin);

CREATE INDEX IF NOT EXISTS idx_calendario_eventos_tipo
  ON calendario_eventos(institucion_id, tipo);

CREATE INDEX IF NOT EXISTS idx_calendario_eventos_ciclo
  ON calendario_eventos(ciclo_id);

CREATE TRIGGER trg_calendario_eventos_updated_at
  BEFORE UPDATE ON calendario_eventos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
