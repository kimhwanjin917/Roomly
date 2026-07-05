CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  label        TEXT        NOT NULL,
  key_hash     TEXT        NOT NULL UNIQUE,  -- SHA-256 해시 저장
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_hotel_isolation" ON api_keys
  USING (hotel_id = (SELECT (auth.jwt()->'app_metadata'->>'hotel_id')::uuid));
