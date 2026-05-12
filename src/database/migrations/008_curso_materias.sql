-- 008_curso_materias: pivot table linking cursos ↔ materias

CREATE TABLE IF NOT EXISTS curso_materias (
  curso_id   UUID NOT NULL REFERENCES cursos(id)   ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (curso_id, materia_id)
);

CREATE INDEX IF NOT EXISTS idx_curso_materias_curso   ON curso_materias(curso_id);
CREATE INDEX IF NOT EXISTS idx_curso_materias_materia ON curso_materias(materia_id);
