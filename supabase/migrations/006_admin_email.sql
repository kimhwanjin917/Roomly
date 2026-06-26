-- ============================================================
-- Roomly 006_admin_email — hotels.admin_email 컬럼 추가
-- 목적: 크론에서 listUsers() 호출 제거 (1000명 한도 우회)
-- ============================================================

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS admin_email TEXT;

CREATE INDEX IF NOT EXISTS idx_hotels_admin_email
  ON hotels (admin_email) WHERE admin_email IS NOT NULL;

-- 기존 호텔의 admin_email 백필 (auth.users에서 hotel_id 매핑)
-- Supabase SQL Editor에서 실행 (service_role 필요):
-- UPDATE hotels h
-- SET admin_email = u.email
-- FROM auth.users u
-- WHERE (u.raw_app_meta_data->>'hotel_id')::uuid = h.id
--   AND h.admin_email IS NULL;
