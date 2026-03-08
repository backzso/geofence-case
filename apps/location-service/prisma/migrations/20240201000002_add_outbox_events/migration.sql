-- Migration: Add location.outbox_events table
-- 
-- Outbox rows are inserted atomically with user_area_state mutations.
-- The poller atomically claims rows (pending → processing) via CTE+UPDATE+SKIP LOCKED.
-- Published rows are marked published; failed rows reset to pending with attempts++.

CREATE TABLE IF NOT EXISTS location.outbox_events (
  id              UUID         NOT NULL DEFAULT gen_random_uuid(),
  event_id        UUID         NOT NULL,
  aggregate_type  VARCHAR(64)  NOT NULL,
  aggregate_id    UUID,
  event_type      VARCHAR(64)  NOT NULL,
  partition_key   VARCHAR(128) NOT NULL,
  payload         JSONB        NOT NULL,
  status          VARCHAR(16)  NOT NULL DEFAULT 'pending',
  attempts        INT          NOT NULL DEFAULT 0,
  available_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE (event_id)
);

-- Partial index: efficient poller claim query filters on status='pending'
-- Covers: WHERE status='pending' AND available_at <= NOW() ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS idx_outbox_events_claimable
  ON location.outbox_events (available_at ASC, created_at ASC)
  WHERE status = 'pending';
