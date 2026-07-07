-- T-201: 연 단위 구독 (2개월 무료)
-- 결제 주기 컬럼 — 'monthly' | 'yearly'
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS billing_interval TEXT NOT NULL DEFAULT 'monthly'
  CHECK (billing_interval IN ('monthly', 'yearly'));
