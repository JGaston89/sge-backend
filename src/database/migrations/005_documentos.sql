-- ============================================================
-- SGE — Migración 005: Documentación adjunta al legajo (S3)
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS alumno_documentos (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID         NOT NULL REFERENCES instituciones(id) ON DELETE RESTRICT,
  alumno_id      UUID         NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  tipo_documento VARCHAR(100) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  s3_key         VARCHAR(500) NOT NULL,
  s3_bucket      VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  tamano_bytes   INTEGER      NOT NULL,
  version        INTEGER      NOT NULL DEFAULT 1,
  subido_por     UUID         NOT NULL REFERENCES usuarios(id),
  activo         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  deleted_by     UUID         REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_alumno_documentos_alumno
  ON alumno_documentos(alumno_id) WHERE activo = TRUE;

CREATE INDEX IF NOT EXISTS idx_alumno_documentos_alumno_tipo
  ON alumno_documentos(alumno_id, tipo_documento) WHERE activo = TRUE;

COMMIT;
