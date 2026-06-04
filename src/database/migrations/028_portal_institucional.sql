-- ─────────────────────────────────────────────────────────────────
-- Migración 028 — Portal Institucional Público
-- Perfil público de la institución y tabla de noticias
-- ─────────────────────────────────────────────────────────────────

-- ── Extender tabla instituciones con datos del perfil público ─────

ALTER TABLE instituciones
  ADD COLUMN IF NOT EXISTS logo_url         TEXT,
  ADD COLUMN IF NOT EXISTS banner_url       TEXT,
  ADD COLUMN IF NOT EXISTS motto            VARCHAR(300),
  ADD COLUMN IF NOT EXISTS descripcion      TEXT,
  ADD COLUMN IF NOT EXISTS email_contacto   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS telefono_contacto VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sitio_web        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS color_primario   VARCHAR(7)  DEFAULT '#1e3a5f',
  ADD COLUMN IF NOT EXISTS color_secundario VARCHAR(7)  DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS redes_sociales   JSONB       DEFAULT '{}';

COMMENT ON COLUMN instituciones.logo_url          IS 'URL del logo (almacenado en MinIO/S3)';
COMMENT ON COLUMN instituciones.banner_url         IS 'URL de la imagen hero del portal público';
COMMENT ON COLUMN instituciones.motto              IS 'Lema o eslogan institucional';
COMMENT ON COLUMN instituciones.color_primario     IS 'Color principal en hex (#rrggbb) para branding del portal';
COMMENT ON COLUMN instituciones.color_secundario   IS 'Color secundario en hex (#rrggbb) para branding del portal';
COMMENT ON COLUMN instituciones.redes_sociales     IS 'JSON: { facebook, instagram, twitter, youtube, linkedin }';

-- ── Tabla de noticias del portal público ──────────────────────────

CREATE TABLE IF NOT EXISTS noticias (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID         NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  titulo         VARCHAR(300) NOT NULL,
  slug           VARCHAR(350) NOT NULL,
  resumen        TEXT,
  contenido      TEXT         NOT NULL,
  imagen_url     TEXT,
  categoria      VARCHAR(20)  NOT NULL DEFAULT 'general'
                   CHECK (categoria IN ('noticia','evento','deporte','logro','comunicado','general')),
  destacada      BOOLEAN      NOT NULL DEFAULT false,
  publicada      BOOLEAN      NOT NULL DEFAULT false,
  autor_id       UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  publicado_en   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Slug único por institución
CREATE UNIQUE INDEX IF NOT EXISTS idx_noticias_slug ON noticias(institucion_id, slug);
CREATE INDEX IF NOT EXISTS idx_noticias_inst_pub ON noticias(institucion_id, publicada, publicado_en DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_categoria ON noticias(institucion_id, categoria) WHERE publicada = true;
CREATE INDEX IF NOT EXISTS idx_noticias_destacadas ON noticias(institucion_id, destacada) WHERE publicada = true;

-- Trigger updated_at
CREATE TRIGGER trg_noticias_updated_at
  BEFORE UPDATE ON noticias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
