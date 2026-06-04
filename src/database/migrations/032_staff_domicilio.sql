-- ─────────────────────────────────────────────────────────────────
-- Migración 032 — Domicilio, datos personales en Docentes y Admin
-- Agrega fecha_nacimiento, genero, nacionalidad y domicilio
-- estructurado a legajos_docentes y staff_administrativo.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE legajos_docentes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento  DATE,
  ADD COLUMN IF NOT EXISTS genero            VARCHAR(20)
    CHECK (genero IN ('masculino','femenino','otro','no_especificado')),
  ADD COLUMN IF NOT EXISTS nacionalidad      VARCHAR(60),
  ADD COLUMN IF NOT EXISTS domicilio_calle   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS domicilio_numero  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS domicilio_piso    VARCHAR(10),
  ADD COLUMN IF NOT EXISTS domicilio_torre   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS domicilio_depto   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS localidad         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS provincia         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS codigo_postal     VARCHAR(10);

ALTER TABLE staff_administrativo
  ADD COLUMN IF NOT EXISTS fecha_nacimiento  DATE,
  ADD COLUMN IF NOT EXISTS genero            VARCHAR(20)
    CHECK (genero IN ('masculino','femenino','otro','no_especificado')),
  ADD COLUMN IF NOT EXISTS nacionalidad      VARCHAR(60),
  ADD COLUMN IF NOT EXISTS domicilio_calle   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS domicilio_numero  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS domicilio_piso    VARCHAR(10),
  ADD COLUMN IF NOT EXISTS domicilio_torre   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS domicilio_depto   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS localidad         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS provincia         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS codigo_postal     VARCHAR(10);
