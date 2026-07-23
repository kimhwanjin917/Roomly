-- ───────────────────────────────────────────
-- 019. staff.employment_type — 고용 형태 (T-일용직)
--   regular: 관리자가 직접 등록한 상용 직원 (기본값)
--   temp:    일일 근무자 코드로 스스로 등록한 일용직
-- 일일 근무자 QR 흐름에서 전화번호로 기존 직원을 재인식하기 위해
-- (hotel_id, phone_number) 조회용 인덱스도 함께 추가한다.
-- ───────────────────────────────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS employment_type TEXT NOT NULL DEFAULT 'regular'
  CHECK (employment_type IN ('regular', 'temp'));

CREATE INDEX IF NOT EXISTS idx_staff_hotel_phone
  ON staff (hotel_id, phone_number)
  WHERE phone_number IS NOT NULL;
