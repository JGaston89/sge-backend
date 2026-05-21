-- Tabla de legajos para personal administrativo
CREATE TABLE IF NOT EXISTS staff_administrativo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  dni             VARCHAR(20),
  email           VARCHAR(255),
  telefono        VARCHAR(30),
  cargo           VARCHAR(100),
  fecha_ingreso   DATE,
  estado          VARCHAR(20) NOT NULL DEFAULT 'activo'
                    CHECK (estado IN ('activo', 'inactivo')),
  observaciones   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (institucion_id, dni)
);

CREATE INDEX IF NOT EXISTS idx_staff_administrativo_institucion ON staff_administrativo(institucion_id);
CREATE INDEX IF NOT EXISTS idx_staff_administrativo_usuario_id  ON staff_administrativo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_staff_administrativo_estado      ON staff_administrativo(estado);

-- Trigger para updated_at automático
CREATE TRIGGER trg_staff_administrativo_updated_at
  BEFORE UPDATE ON staff_administrativo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
