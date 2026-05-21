-- Migración 027: campo para rate-limit de reenvío de activación
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ultimo_envio_activacion TIMESTAMPTZ NULL;
