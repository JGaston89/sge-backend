-- Migration 026: Agregar campos de activación de cuenta a usuarios
-- Permite el flujo de auto-creación de cuenta con token de activación por email

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS activation_token       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS activation_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cuenta_activada        BOOLEAN NOT NULL DEFAULT true;

-- Todos los usuarios existentes ya están activos (creados con acceso)
UPDATE usuarios SET cuenta_activada = true WHERE cuenta_activada IS DISTINCT FROM true;

CREATE INDEX IF NOT EXISTS idx_usuarios_activation_token ON usuarios (activation_token) WHERE activation_token IS NOT NULL;
