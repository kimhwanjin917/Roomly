-- ============================================================
-- Roomly 007_phase3 — Phase 3 신규 테이블 및 컬럼
-- 멱등성 보장: IF NOT EXISTS / IF NOT EXISTS
-- ============================================================

-- ───────────────────────────────────────────
-- 1. payment_logs (결제 내역 + 웹훅 멱등성)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         UUID        REFERENCES hotels(id) ON DELETE CASCADE,
  toss_payment_key TEXT        UNIQUE,
  amount           INTEGER     NOT NULL,
  plan             TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'success'
                               CHECK (status IN ('success', 'failed', 'refunded')),
  paid_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_billing_at  TIMESTAMPTZ,
  raw_event        JSONB
);
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_logs_admin ON payment_logs
  USING (hotel_id = (SELECT (auth.jwt()->'app_metadata'->>'hotel_id')::uuid));

-- ───────────────────────────────────────────
-- 2. email_logs (이메일 발송 실패 로깅)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID        REFERENCES hotels(id) ON DELETE SET NULL,
  to_email    TEXT        NOT NULL,
  template    TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'sent'
                          CHECK (status IN ('sent', 'failed')),
  error_msg   TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────
-- 3. supplies + supply_requests (비품 관리)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  unit        TEXT        NOT NULL DEFAULT '개',
  stock       INTEGER     NOT NULL DEFAULT 0,
  low_stock   INTEGER     NOT NULL DEFAULT 5,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplies_admin ON supplies
  USING (hotel_id = (SELECT (auth.jwt()->'app_metadata'->>'hotel_id')::uuid));

CREATE TABLE IF NOT EXISTS supply_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id   UUID        NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  hotel_id    UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  staff_id    UUID        REFERENCES staff(id) ON DELETE SET NULL,
  room_id     UUID        REFERENCES rooms(id) ON DELETE SET NULL,
  qty         INTEGER     NOT NULL DEFAULT 1,
  note        TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'fulfilled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);
ALTER TABLE supply_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY supply_requests_admin ON supply_requests
  USING (hotel_id = (SELECT (auth.jwt()->'app_metadata'->>'hotel_id')::uuid));

-- ───────────────────────────────────────────
-- 4. maintenance_requests (유지보수 신고)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id      UUID        REFERENCES rooms(id) ON DELETE SET NULL,
  staff_id     UUID        REFERENCES staff(id) ON DELETE SET NULL,
  description  TEXT        NOT NULL,
  photo_url    TEXT,
  status       TEXT        NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open', 'in_progress', 'resolved')),
  reported_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID        REFERENCES hotels(id) ON DELETE SET NULL
);
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY maintenance_admin ON maintenance_requests
  USING (hotel_id = (SELECT (auth.jwt()->'app_metadata'->>'hotel_id')::uuid));

-- ───────────────────────────────────────────
-- 5. api_keys (공개 API 키)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  key_hash    TEXT        NOT NULL UNIQUE,
  key_prefix  TEXT        NOT NULL,
  name        TEXT        NOT NULL DEFAULT 'Default',
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_admin ON api_keys
  USING (hotel_id = (SELECT (auth.jwt()->'app_metadata'->>'hotel_id')::uuid));

-- ───────────────────────────────────────────
-- 6. organizations (체인 호텔 법인)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  owner_id    UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- ───────────────────────────────────────────
-- 7. hotels.billing_interval (연간 구독)
-- ───────────────────────────────────────────
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS billing_interval TEXT NOT NULL DEFAULT 'monthly'
  CHECK (billing_interval IN ('monthly', 'annual'));

-- ───────────────────────────────────────────
-- 8. hotels.settings (관리자 설정 JSON)
-- ───────────────────────────────────────────
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

-- ───────────────────────────────────────────
-- 9. Realtime 활성화 대상 테이블 인덱스
-- ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_maintenance_hotel ON maintenance_requests (hotel_id);
CREATE INDEX IF NOT EXISTS idx_supplies_hotel ON supplies (hotel_id);
CREATE INDEX IF NOT EXISTS idx_supply_requests_hotel ON supply_requests (hotel_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_hotel ON payment_logs (hotel_id);
