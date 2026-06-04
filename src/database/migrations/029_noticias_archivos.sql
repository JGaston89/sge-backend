-- ─────────────────────────────────────────────────────────────────
-- Migración 029 — Archivos adjuntos en noticias
-- Agrega columna archivos (JSONB) para imágenes y documentos
-- subidos directamente desde el editor de noticias.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE noticias
  ADD COLUMN IF NOT EXISTS archivos JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN noticias.archivos IS
  'Array de archivos adjuntos: [{nombre, url, s3_key, mime_type, tamano_bytes}]';
