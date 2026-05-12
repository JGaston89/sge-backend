-- ============================================================
-- SGE — Migración 004: Columnas PDF en actas
-- ============================================================

BEGIN;

ALTER TABLE actas
  ADD COLUMN IF NOT EXISTS pdf_url         TEXT,
  ADD COLUMN IF NOT EXISTS pdf_hash        VARCHAR(64),
  ADD COLUMN IF NOT EXISTS pdf_generado_at TIMESTAMPTZ;

COMMIT;
