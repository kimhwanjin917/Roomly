-- 비품(supplies) 테이블
CREATE TABLE IF NOT EXISTS supplies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  unit        TEXT        NOT NULL DEFAULT '개',
  stock       INTEGER     NOT NULL DEFAULT 0,
  min_stock   INTEGER     NOT NULL DEFAULT 5,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 비품 요청(supply_requests) 테이블
CREATE TABLE IF NOT EXISTS supply_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id     UUID        REFERENCES rooms(id) ON DELETE SET NULL,
  staff_id    UUID        REFERENCES staff(id) ON DELETE SET NULL,
  supply_id   UUID        NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  quantity    INTEGER     NOT NULL DEFAULT 1,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_requests ENABLE ROW LEVEL SECURITY;

-- supplies RLS: 같은 hotel_id만 접근
CREATE POLICY "supplies_hotel_isolation" ON supplies
  USING (hotel_id = (SELECT (auth.jwt()->'app_metadata'->>'hotel_id')::uuid));

-- supply_requests RLS: 같은 hotel_id만 접근
CREATE POLICY "supply_requests_hotel_isolation" ON supply_requests
  USING (hotel_id = (SELECT (auth.jwt()->'app_metadata'->>'hotel_id')::uuid));
