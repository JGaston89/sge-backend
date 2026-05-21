-- ============================================================
-- SGE — Migración 024: Vincular alumnos con cuentas de usuario
-- ============================================================
-- Agrega usuario_id a la tabla alumnos, igual que ya existe en
-- legajos_docentes. Permite que un alumno tenga cuenta de login
-- y que en el futuro pueda ser "promovido" a otro rol.
-- La columna es nullable: un alumno puede existir sin cuenta.
-- ============================================================

BEGIN;

ALTER TABLE alumnos
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alumnos_usuario_id ON alumnos(usuario_id);

COMMIT;
