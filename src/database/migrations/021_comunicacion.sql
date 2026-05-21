-- ─────────────────────────────────────────────────────────────────
-- Migración 021 — Módulo Comunicación
-- Circulares, mensajería interna y log de notificaciones
-- ─────────────────────────────────────────────────────────────────

-- ── Circulares / tablón de anuncios institucional ─────────────────

CREATE TABLE IF NOT EXISTS circulares (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id     UUID        NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  titulo             VARCHAR(300) NOT NULL,
  contenido          TEXT        NOT NULL,
  tipo               VARCHAR(15) NOT NULL CHECK (tipo IN ('circular','aviso','comunicado')) DEFAULT 'circular',
  destinatarios_tipo VARCHAR(20) NOT NULL CHECK (destinatarios_tipo IN ('todos','docentes','alumnos','familias','administrativos')) DEFAULT 'todos',
  fecha_publicacion  DATE        NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento  DATE,
  created_by         UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circulares_inst ON circulares(institucion_id, fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_circulares_tipo ON circulares(tipo);

-- Registro de lectura de circulares por usuario
CREATE TABLE IF NOT EXISTS circulares_vistas (
  circular_id UUID NOT NULL REFERENCES circulares(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  visto_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (circular_id, usuario_id)
);

-- ── Mensajería interna — hilos de conversación ────────────────────

CREATE TABLE IF NOT EXISTS mensajes_conversaciones (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID        NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  asunto         VARCHAR(300),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Participantes de cada conversación
CREATE TABLE IF NOT EXISTS mensajes_participantes (
  conversacion_id UUID NOT NULL REFERENCES mensajes_conversaciones(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (conversacion_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_usuario ON mensajes_participantes(usuario_id);

-- Mensajes individuales dentro de un hilo
CREATE TABLE IF NOT EXISTS mensajes (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversacion_id UUID        NOT NULL REFERENCES mensajes_conversaciones(id) ON DELETE CASCADE,
  remitente_id    UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  cuerpo          TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_conv ON mensajes(conversacion_id, created_at);

-- Confirmación de lectura por mensaje
CREATE TABLE IF NOT EXISTS mensajes_leidos (
  mensaje_id UUID NOT NULL REFERENCES mensajes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  leido_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (mensaje_id, usuario_id)
);

-- ── Log de notificaciones enviadas ────────────────────────────────

CREATE TABLE IF NOT EXISTS notificaciones (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id        UUID        NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  tipo                  VARCHAR(15) NOT NULL CHECK (tipo IN ('email','sms','push','interna')),
  destinatario_id       UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  destinatario_email    VARCHAR(255),
  destinatario_telefono VARCHAR(30),
  asunto                VARCHAR(300),
  cuerpo                TEXT,
  estado                VARCHAR(15) NOT NULL CHECK (estado IN ('pendiente','enviado','fallido','leido')) DEFAULT 'pendiente',
  referencia_tipo       VARCHAR(50),
  referencia_id         UUID,
  error_detalle         TEXT,
  enviado_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_inst ON notificaciones(institucion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_dest ON notificaciones(destinatario_id);
