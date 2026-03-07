CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

CREATE SCHEMA IF NOT EXISTS geofence;

SET search_path TO geofence, public;

CREATE TABLE IF NOT EXISTS geofence.areas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(120) NOT NULL,
  geom       public.geometry(Polygon, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS areas_geom_gist_idx
  ON geofence.areas
  USING GIST (geom)