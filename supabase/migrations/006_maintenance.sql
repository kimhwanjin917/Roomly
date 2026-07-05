CREATE TABLE IF NOT EXISTS maintenance_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id      UUID        REFERENCES rooms(id) ON DELETE SET NULL,
  staff_id     UUID        REFERENCES staff(id) ON DELETE SET NULL,
  description  TEXT        NOT NULL,
  photo_url    TEXT,
  status       TEXT        NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_hotel_isolation" ON maintenance_requests
  USING (hotel_id = (SELECT (auth.jwt()->'app_metadata'->>'hotel_id')::uuid));
