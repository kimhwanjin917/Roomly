-- ───────────────────────────────────────────
-- 018: supplies / supply_requests 스키마 정합성 보정
--
-- 005_supplies.sql과 007_phase3.sql이 같은 두 테이블을 서로 다른
-- 컬럼셋으로 CREATE TABLE IF NOT EXISTS 했다 (email_logs/api_keys와 동일한 패턴).
-- 이 DB는 005 버전(min_stock, quantity)이 먼저 적용되어 있었는데,
-- 앱 코드(app/admin/supplies, app/api/worker/supply-request)는 전부
-- 007 버전 컬럼(low_stock, qty, note, status, fulfilled_at)을 쓰고 있어
-- 비품 관리·요청 기능이 프로덕션에서 동작하지 않는 상태였다.
-- ───────────────────────────────────────────

-- 1) supplies.low_stock — 기존 min_stock 값을 그대로 이전
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS low_stock INTEGER NOT NULL DEFAULT 5;
UPDATE supplies SET low_stock = min_stock WHERE min_stock IS NOT NULL;

-- 2) supply_requests — 007 버전 컬럼 보강, 기존 quantity 값을 qty로 이전
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS qty INTEGER NOT NULL DEFAULT 1;
UPDATE supply_requests SET qty = quantity WHERE quantity IS NOT NULL;

ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
DO $$
BEGIN
  ALTER TABLE supply_requests ADD CONSTRAINT supply_requests_status_check
    CHECK (status IN ('pending', 'fulfilled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- supply_id가 005 버전에서는 NOT NULL이었다 (008_supply_nullable.sql이 이미 해제했어야 하지만 재확인)
DO $$
BEGIN
  ALTER TABLE supply_requests ALTER COLUMN supply_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
