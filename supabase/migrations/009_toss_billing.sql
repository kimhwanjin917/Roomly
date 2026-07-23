-- ───────────────────────────────────────────
-- T-092: Toss Payments 빌링 전환
-- Stripe 컬럼 제거 + Toss 빌링 컬럼 추가
-- ───────────────────────────────────────────

-- Toss 빌링 관련 컬럼 추가
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS toss_customer_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS toss_billing_key TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_plan TEXT
    CHECK (pending_plan IN ('starter', 'standard', 'pro')),
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- subscription_plan CHECK 제약에 'trial' 추가 + 기본값 'trial'
-- (001_init.sql의 인라인 CHECK는 'trial'을 허용하지 않으므로 재생성)
ALTER TABLE hotels ALTER COLUMN subscription_plan SET DEFAULT 'trial';
ALTER TABLE hotels DROP CONSTRAINT IF EXISTS hotels_subscription_plan_check;
ALTER TABLE hotels ADD CONSTRAINT hotels_subscription_plan_check
  CHECK (subscription_plan IN ('trial', 'starter', 'standard', 'pro'));

-- Stripe 컬럼 제거 (004_billing.sql에서 추가된 컬럼)
ALTER TABLE hotels
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;
