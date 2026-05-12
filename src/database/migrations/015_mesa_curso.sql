-- Agrega columna curso_id a mesas_examen (aditiva, nullable)
ALTER TABLE mesas_examen
  ADD COLUMN IF NOT EXISTS curso_id UUID REFERENCES cursos(id);
