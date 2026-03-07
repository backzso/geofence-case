CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS logging;

CREATE TABLE IF NOT EXISTS logging.area_transition_logs (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL,
  user_id     UUID        NOT NULL,
  area_id     UUID        NOT NULL,
  event_type  VARCHAR(32) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE (event_id)
);
