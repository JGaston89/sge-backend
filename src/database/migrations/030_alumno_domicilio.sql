-- ─────────────────────────────────────────────────────────────────
-- Migración 030 — Domicilio estructurado en alumnos
-- Reemplaza el campo domicilio (texto libre) y contactos (JSONB)
-- por campos individuales de dirección.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE alumnos
  ADD COLUMN IF NOT EXISTS domicilio_calle   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS domicilio_numero  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS domicilio_piso    VARCHAR(10),
  ADD COLUMN IF NOT EXISTS domicilio_torre   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS domicilio_depto   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS localidad         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS provincia         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS codigo_postal     VARCHAR(10);

ALTER TABLE alumnos
  DROP COLUMN IF EXISTS domicilio,
  DROP COLUMN IF EXISTS contactos;
