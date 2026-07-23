-- ───────────────────────────────────────────
-- T-027: 결제 내역 로그 테이블
-- toss_order_id UNIQUE 제약으로 웹훅 멱등성 보장 (T-082)
-- ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       UUID        REFERENCES hotels(id),
  toss_order_id  TEXT        UNIQUE,
  amount         INT,
  plan           TEXT,
  status         TEXT        CHECK (status IN ('success', 'failed')),
  failure_reason TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_hotel_created
  ON payment_logs (hotel_id, created_at DESC);

-- RLS: service role만 접근 (정책 없이 RLS만 활성화 → anon/authenticated 차단)
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
