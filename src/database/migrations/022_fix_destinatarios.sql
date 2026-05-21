-- ─────────────────────────────────────────────────────────────────
-- Migración 022 — Circulares: destinatarios + adjuntos
-- • Elimina 'familias' (redundante con 'alumnos')
-- • Agrega 'docentes_y_administrativos' (para comunicados combinados)
-- • Agrega columna adjuntos JSONB (preparación para carga de archivos)
-- ─────────────────────────────────────────────────────────────────

-- Actualizar filas que tenían 'familias' → 'alumnos' (integridad antes del DROP)
UPDATE circulares SET destinatarios_tipo = 'alumnos' WHERE destinatarios_tipo = 'familias';

ALTER TABLE circulares DROP CONSTRAINT IF EXISTS circulares_destinatarios_tipo_check;

ALTER TABLE circulares
  ADD CONSTRAINT circulares_destinatarios_tipo_check
  CHECK (destinatarios_tipo IN (
    'todos', 'docentes', 'alumnos', 'administrativos', 'docentes_y_administrativos'
  ));

ALTER TABLE circulares
  ADD COLUMN IF NOT EXISTS adjuntos JSONB NOT NULL DEFAULT '[]';
