-- ============================================================
-- Roomly 005_patch — 누적 수정 마이그레이션
-- Supabase SQL Editor에서 한 번에 전체 실행
-- 멱등성 보장: 이미 적용된 항목은 건너뜀
-- ============================================================

-- ───────────────────────────────────────────
-- 1. staff.role 컬럼 (Dirty Worker 지원)
-- ───────────────────────────────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'housekeeping'
  CONSTRAINT staff_role_check CHECK (role IN ('housekeeping', 'dirty'));

-- ───────────────────────────────────────────
-- 2. staff.first_accessed_at (온보딩 D+3 크론 기준)
-- ───────────────────────────────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS first_accessed_at TIMESTAMPTZ;

-- ───────────────────────────────────────────
-- 3. push_subscriptions: auth_key → auth
--    001_init.sql이 auth_key로 만들었으면 rename
--    003_push_subscriptions.sql이 이미 auth로 만들었으면 스킵
-- ───────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_subscriptions' AND column_name = 'auth_key'
  ) THEN
    ALTER TABLE push_subscriptions RENAME COLUMN auth_key TO auth;
  END IF;
END $$;

-- ───────────────────────────────────────────
-- 4. hotels: stripe 컬럼 제거 (토스로 완전 전환)
--    004_billing.sql이 이미 추가했을 수 있으므로 DROP IF EXISTS
-- ───────────────────────────────────────────
ALTER TABLE hotels DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE hotels DROP COLUMN IF EXISTS stripe_subscription_id;

-- ───────────────────────────────────────────
-- 5. hotels: subscription_plan CHECK에 'trial' 추가
-- ───────────────────────────────────────────
ALTER TABLE hotels DROP CONSTRAINT IF EXISTS hotels_subscription_plan_check;
ALTER TABLE hotels ADD CONSTRAINT hotels_subscription_plan_check
  CHECK (subscription_plan IN ('trial', 'starter', 'standard', 'pro'));
ALTER TABLE hotels ALTER COLUMN subscription_plan SET DEFAULT 'trial';

-- ───────────────────────────────────────────
-- 6. hotels: 토스페이먼츠 + 온보딩 추적 컬럼
-- ───────────────────────────────────────────
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS toss_customer_key  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS toss_billing_key   TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active_at     TIMESTAMPTZ;
-- admin_email은 006_admin_email.sql에서 별도 처리 (인덱스 + 백필 쿼리 포함)

-- ───────────────────────────────────────────
-- 7. licenses 테이블 (슈퍼어드민 라이선스 키)
--    001_init.sql에 없는 경우 생성
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at    TIMESTAMPTZ,
  hotel_id   UUID        REFERENCES hotels(id) ON DELETE SET NULL
);

-- ───────────────────────────────────────────
-- 8. 인덱스 추가 (없는 것만)
-- ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hotels_toss_customer_key
  ON hotels (toss_customer_key) WHERE toss_customer_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_first_accessed
  ON staff (hotel_id) WHERE first_accessed_at IS NULL;

-- ───────────────────────────────────────────
-- 적용 확인 쿼리 (실행 후 아래로 확인)
-- ───────────────────────────────────────────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'hotels'
-- ORDER BY ordinal_position;

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'staff';

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'push_subscriptions';
