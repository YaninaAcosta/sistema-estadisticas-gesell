-- Relevamiento Gesell: schema para Supabase (PostgreSQL)
-- Ejecutar en Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('viewer', 'agente', 'admin')),
  oficina TEXT
);

CREATE TABLE IF NOT EXISTS alojamientos (
  id SERIAL PRIMARY KEY,
  localidad TEXT NOT NULL DEFAULT 'Villa Gesell',
  categoria TEXT,
  prestador TEXT NOT NULL,
  web TEXT,
  funcionamiento TEXT,
  observaciones TEXT,
  direccion TEXT,
  telefono_fijo TEXT,
  whatsapp TEXT,
  pagina_web TEXT,
  plazas_totales INTEGER,
  oficina TEXT,
  oculto INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS relevamiento_config (
  fecha TEXT PRIMARY KEY,
  consultar_ocupacion INTEGER NOT NULL DEFAULT 1,
  consultar_reservas INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_permissions (
  rol TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (rol, permission)
);

CREATE TABLE IF NOT EXISTS relevamientos (
  id SERIAL PRIMARY KEY,
  fecha TEXT NOT NULL,
  alojamiento_id INTEGER NOT NULL REFERENCES alojamientos(id) ON DELETE CASCADE,
  plazas_relevadas INTEGER,
  plazas_ocupadas_anterior INTEGER,
  plazas_ocupadas INTEGER,
  reservas INTEGER,
  disponibilidad_texto TEXT,
  llamados TEXT,
  observaciones TEXT,
  oficina TEXT,
  agente TEXT,
  UNIQUE(fecha, alojamiento_id)
);
CREATE INDEX IF NOT EXISTS idx_relevamientos_fecha ON relevamientos(fecha);
CREATE INDEX IF NOT EXISTS idx_relevamientos_alojamiento ON relevamientos(alojamiento_id);

-- Inmobiliarias
CREATE TABLE IF NOT EXISTS inmobiliarias (
  id SERIAL PRIMARY KEY,
  localidad TEXT NOT NULL DEFAULT 'Villa Gesell',
  prestador TEXT NOT NULL,
  direccion TEXT,
  telefono_fijo TEXT,
  whatsapp TEXT,
  oficina TEXT,
  oculto INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inmobiliarias_config (
  fecha TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS relevamiento_inmobiliarias (
  id SERIAL PRIMARY KEY,
  fecha TEXT NOT NULL,
  inmobiliaria_id INTEGER NOT NULL REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  ocupacion_dptos_pct INTEGER,
  ocupacion_casas_pct INTEGER,
  llamados TEXT,
  observaciones TEXT,
  oficina TEXT,
  agente TEXT,
  UNIQUE(fecha, inmobiliaria_id)
);
CREATE INDEX IF NOT EXISTS idx_relev_inmob_fecha ON relevamiento_inmobiliarias(fecha);
CREATE INDEX IF NOT EXISTS idx_relev_inmob_inmobiliaria ON relevamiento_inmobiliarias(inmobiliaria_id);

-- Balnearios
CREATE TABLE IF NOT EXISTS balnearios (
  id SERIAL PRIMARY KEY,
  localidad TEXT NOT NULL DEFAULT 'Villa Gesell',
  prestador TEXT NOT NULL,
  direccion TEXT,
  telefono_fijo TEXT,
  whatsapp TEXT,
  oficina TEXT,
  oculto INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS balnearios_config (
  fecha TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS relevamiento_balnearios (
  id SERIAL PRIMARY KEY,
  fecha TEXT NOT NULL,
  balneario_id INTEGER NOT NULL REFERENCES balnearios(id) ON DELETE CASCADE,
  ocupacion_pct INTEGER,
  llamados TEXT,
  observaciones TEXT,
  oficina TEXT,
  agente TEXT,
  UNIQUE(fecha, balneario_id)
);
CREATE INDEX IF NOT EXISTS idx_relev_baln_fecha ON relevamiento_balnearios(fecha);
CREATE INDEX IF NOT EXISTS idx_relev_baln_balneario ON relevamiento_balnearios(balneario_id);
