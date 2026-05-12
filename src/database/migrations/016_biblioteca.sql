-- ─────────────────────────────────────────────────────────────────
-- Migración 016 — Módulo Biblioteca
-- ─────────────────────────────────────────────────────────────────

-- Catálogo de materiales (libros, e-books, papers, recursos)
CREATE TABLE IF NOT EXISTS biblioteca_materiales (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id   UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  titulo           VARCHAR(300) NOT NULL,
  autor            VARCHAR(200),
  isbn             VARCHAR(20),
  categoria        VARCHAR(100),
  tipo             VARCHAR(10)  NOT NULL CHECK (tipo IN ('fisico','digital')) DEFAULT 'fisico',
  url_digital      TEXT,
  descripcion      TEXT,
  portada_url      TEXT,
  editorial        VARCHAR(150),
  anio_publicacion SMALLINT,
  idioma           VARCHAR(50)  DEFAULT 'Español',
  created_by       UUID,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ISBN único por institución (solo cuando tiene ISBN)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mat_isbn
  ON biblioteca_materiales(institucion_id, isbn)
  WHERE isbn IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mat_titulo    ON biblioteca_materiales(institucion_id, titulo);
CREATE INDEX IF NOT EXISTS idx_mat_categoria ON biblioteca_materiales(institucion_id, categoria);

-- Ejemplares físicos de un material
CREATE TABLE IF NOT EXISTS biblioteca_ejemplares (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES biblioteca_materiales(id) ON DELETE CASCADE,
  codigo_qr   VARCHAR(100) UNIQUE,
  estado      VARCHAR(15)  NOT NULL CHECK (estado IN ('disponible','prestado','perdido','baja')) DEFAULT 'disponible',
  notas       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ej_material ON biblioteca_ejemplares(material_id, estado);

-- Solo un préstamo activo por ejemplar al mismo tiempo
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ej_activo
  ON biblioteca_ejemplares(id)
  WHERE estado = 'prestado';

-- Préstamos (alumno o docente como prestatario)
CREATE TABLE IF NOT EXISTS biblioteca_prestamos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id   UUID NOT NULL REFERENCES instituciones(id),
  ejemplar_id      UUID NOT NULL REFERENCES biblioteca_ejemplares(id),
  alumno_id        UUID REFERENCES alumnos(id),
  docente_id       UUID REFERENCES legajos_docentes(id),
  fecha_prestamo   DATE        NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE       NOT NULL,
  fecha_devolucion DATE,
  estado           VARCHAR(10) NOT NULL CHECK (estado IN ('activo','devuelto','vencido')) DEFAULT 'activo',
  observaciones    TEXT,
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prestamo_tiene_prestatario CHECK (alumno_id IS NOT NULL OR docente_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_prest_ejemplar  ON biblioteca_prestamos(ejemplar_id);
CREATE INDEX IF NOT EXISTS idx_prest_alumno    ON biblioteca_prestamos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_prest_docente   ON biblioteca_prestamos(docente_id);
CREATE INDEX IF NOT EXISTS idx_prest_estado    ON biblioteca_prestamos(institucion_id, estado);

-- Reservas de material no disponible
CREATE TABLE IF NOT EXISTS biblioteca_reservas (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institucion_id UUID NOT NULL REFERENCES instituciones(id),
  material_id    UUID NOT NULL REFERENCES biblioteca_materiales(id),
  alumno_id      UUID REFERENCES alumnos(id),
  docente_id     UUID REFERENCES legajos_docentes(id),
  fecha_reserva  DATE        NOT NULL DEFAULT CURRENT_DATE,
  estado         VARCHAR(10) NOT NULL CHECK (estado IN ('pendiente','cumplida','cancelada')) DEFAULT 'pendiente',
  notas          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reserva_tiene_solicitante CHECK (alumno_id IS NOT NULL OR docente_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_res_material ON biblioteca_reservas(material_id, estado);
CREATE INDEX IF NOT EXISTS idx_res_alumno   ON biblioteca_reservas(alumno_id);
