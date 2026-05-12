-- ============================================================
-- SGE — Migración 001: Módulo de identidad y acceso (NestJS)
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Instituciones ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instituciones (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre     VARCHAR(200) NOT NULL,
  cuit       VARCHAR(20)  UNIQUE,
  tipo       VARCHAR(20)  NOT NULL DEFAULT 'escuela'
             CHECK (tipo IN ('escuela','universidad','otro')),
  domicilio  TEXT,
  config     JSONB        NOT NULL DEFAULT '{}',
  activo     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Usuarios ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id      UUID         NOT NULL REFERENCES instituciones(id) ON DELETE RESTRICT,
  email               VARCHAR(255) NOT NULL,
  password_hash       TEXT         NOT NULL,
  nombre              VARCHAR(100) NOT NULL,
  apellido            VARCHAR(100) NOT NULL,
  avatar_url          TEXT,

  -- 2FA
  totp_secret         TEXT,
  totp_activo         BOOLEAN      NOT NULL DEFAULT false,
  recovery_codes      TEXT[],

  -- Estado
  activo              BOOLEAN      NOT NULL DEFAULT true,
  email_verificado    BOOLEAN      NOT NULL DEFAULT false,
  primer_acceso       BOOLEAN      NOT NULL DEFAULT true,

  -- Seguridad
  intentos_fallidos   SMALLINT     NOT NULL DEFAULT 0,
  bloqueado_hasta     TIMESTAMPTZ,
  ultimo_acceso       TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (institucion_id, email)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email          ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_institucion_id ON usuarios(institucion_id);

-- ─── Roles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID        NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre         VARCHAR(50) NOT NULL,
  descripcion    TEXT,
  permisos       JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institucion_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_roles_institucion_id ON roles(institucion_id);

-- ─── Usuario ↔ Roles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_roles (
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol_id      UUID NOT NULL REFERENCES roles(id)    ON DELETE CASCADE,
  fecha_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_hasta DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, rol_id)
);

-- ─── Refresh Tokens ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT         NOT NULL UNIQUE,
  user_agent TEXT,
  ip         INET,
  expires_at TIMESTAMPTZ  NOT NULL,
  revoked    BOOLEAN      NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario_id ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ─── Audit Log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGSERIAL    PRIMARY KEY,
  usuario_id     UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  accion         VARCHAR(100) NOT NULL,
  tabla          VARCHAR(60),
  registro_id    UUID,
  ip             INET,
  user_agent     TEXT,
  payload_before JSONB,
  payload_after  JSONB,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_id ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_accion      ON audit_log(accion);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log(created_at DESC);

-- ─── Trigger updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_instituciones_updated_at
  BEFORE UPDATE ON instituciones FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
