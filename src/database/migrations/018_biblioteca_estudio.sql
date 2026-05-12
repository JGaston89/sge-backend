-- ─────────────────────────────────────────────────────────────────
-- Migración 018 — Reestructuración Módulo Biblioteca
-- Reemplaza el módulo de préstamos de libros físicos por un sistema
-- de materiales de estudio con PDFs subidos a S3 por docentes.
-- ─────────────────────────────────────────────────────────────────

-- Eliminar tablas anteriores (orden por dependencias FK)
DROP TABLE IF EXISTS biblioteca_reservas    CASCADE;
DROP TABLE IF EXISTS biblioteca_prestamos   CASCADE;
DROP TABLE IF EXISTS biblioteca_ejemplares  CASCADE;
DROP TABLE IF EXISTS biblioteca_materiales  CASCADE;

-- Índices del módulo anterior (ya eliminados por CASCADE, pero por si acaso)
DROP INDEX IF EXISTS uniq_mat_isbn;
DROP INDEX IF EXISTS idx_mat_titulo;
DROP INDEX IF EXISTS idx_mat_categoria;
DROP INDEX IF EXISTS idx_ej_material;
DROP INDEX IF EXISTS uniq_ej_activo;
DROP INDEX IF EXISTS idx_prest_ejemplar;
DROP INDEX IF EXISTS idx_prest_alumno;
DROP INDEX IF EXISTS idx_prest_docente;
DROP INDEX IF EXISTS idx_prest_estado;
DROP INDEX IF EXISTS idx_res_material;
DROP INDEX IF EXISTS idx_res_alumno;

-- ─────────────────────────────────────────────────────────────────
-- Materiales de estudio (metadata del recurso)
-- Sin institucion_id: deployment single-tenant por institución
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS biblioteca_materiales_estudio (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo       VARCHAR(300) NOT NULL,
  docente_id   UUID         REFERENCES legajos_docentes(id) ON DELETE SET NULL,
  curso_id     UUID         REFERENCES cursos(id)           ON DELETE SET NULL,
  materia_id   UUID         REFERENCES materias(id)         ON DELETE SET NULL,
  temas        TEXT,
  descripcion  TEXT,
  created_by   UUID,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bme_docente ON biblioteca_materiales_estudio(docente_id);
CREATE INDEX IF NOT EXISTS idx_bme_curso   ON biblioteca_materiales_estudio(curso_id);
CREATE INDEX IF NOT EXISTS idx_bme_materia ON biblioteca_materiales_estudio(materia_id);
CREATE INDEX IF NOT EXISTS idx_bme_titulo  ON biblioteca_materiales_estudio(titulo);

-- ─────────────────────────────────────────────────────────────────
-- Archivos PDF vinculados a cada material (1..N por material)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS biblioteca_archivos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id      UUID         NOT NULL REFERENCES biblioteca_materiales_estudio(id) ON DELETE CASCADE,
  nombre_original  VARCHAR(255) NOT NULL,
  titulo_archivo   VARCHAR(300),
  s3_key           TEXT         NOT NULL,
  s3_bucket        TEXT         NOT NULL,
  mime_type        VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  tamano_bytes     BIGINT,
  created_by       UUID,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ba_material ON biblioteca_archivos(material_id);
