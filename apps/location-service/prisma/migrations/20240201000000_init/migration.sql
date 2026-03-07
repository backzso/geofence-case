CREATE SCHEMA IF NOT EXISTS location;

CREATE TABLE IF NOT EXISTS location.user_area_state (
  user_id    UUID         NOT NULL,
  area_id    UUID         NOT NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, area_id)
);
