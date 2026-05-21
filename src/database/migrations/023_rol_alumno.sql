-- ============================================================
-- SGE — Migración 023: Asegurar rol 'alumno' en cada institución
-- ============================================================
-- El seed original solo creó: admin, directivo, administrativo, docente.
-- Esta migración inserta el rol 'alumno' para todas las instituciones
-- que aún no lo tengan, usando ON CONFLICT para ser idempotente.
-- ============================================================

BEGIN;

INSERT INTO roles (institucion_id, nombre, descripcion, permisos)
SELECT id, 'alumno', 'Rol alumno', '{}'
FROM instituciones
ON CONFLICT (institucion_id, nombre) DO NOTHING;

COMMIT;
