-- ───────────────────────────────────────────
-- 017: 스키마 정합성 보정
--
-- 리팩토링 중 발견된 코드 ↔ 스키마 불일치를 바로잡는다.
-- 모두 IF NOT EXISTS / 조건부라 이미 맞는 DB에 재실행해도 안전하다.
-- ───────────────────────────────────────────

-- 1) staff.first_accessed_at
--    onboarding-d3 크론이 "QR 미접속 직원"을 이 컬럼으로 판별하는데
--    어떤 마이그레이션에도 정의되어 있지 않았다. /api/auth/qr에서 최초 1회 기록한다.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS first_accessed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_staff_first_access
  ON staff (hotel_id)
  WHERE first_accessed_at IS NULL;

-- 2) email_logs — 007_phase3.sql과 012_email_logs.sql이 서로 다른 컬럼셋으로
--    같은 테이블을 CREATE IF NOT EXISTS 하고 있었다. 먼저 실행된 쪽이 이기므로
--    DB마다 모양이 달랐다. 양쪽 컬럼을 모두 갖추도록 합집합으로 맞춘다.
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS subject    TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS template   TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS error_msg  TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS sent_at    TIMESTAMPTZ NOT NULL DEFAULT now();

-- 012 버전이 만든 subject/template NOT NULL 제약은 해제 (양쪽 코드 경로 모두 허용)
DO $$
BEGIN
  ALTER TABLE email_logs ALTER COLUMN subject  DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE email_logs ALTER COLUMN template DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_logs_hotel_created
  ON email_logs (hotel_id, created_at DESC);

-- 3) api_keys — 007_phase3.sql(key_prefix/name/last_used/revoked_at)과
--    008_api_keys.sql(label/last_used_at)이 충돌한다. 코드가 쓰는 007 컬럼셋을
--    보장하고, 008이 만든 label NOT NULL은 삽입을 막으므로 해제한다.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name       TEXT NOT NULL DEFAULT 'Default';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used  TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

DO $$
BEGIN
  ALTER TABLE api_keys ALTER COLUMN label DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
     WHEN others THEN NULL;
END $$;

-- 유효한(미폐기) 키 조회용
CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON api_keys (key_hash)
  WHERE revoked_at IS NULL;

-- 4) room_logs 조회 성능 — 통계 CSV/AI 인사이트가 rooms 조인 + changed_at 범위로 조회한다.
CREATE INDEX IF NOT EXISTS idx_room_logs_room_changed
  ON room_logs (room_id, changed_at DESC);
