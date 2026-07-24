-- ───────────────────────────────────────────
-- 022. staff 테이블 Realtime 활성화
--   일용직이 QR로 등록할 때 관리자 화면에 즉시 반영되려면
--   staff 테이블이 supabase_realtime publication에 포함되어야 한다.
--   hotel_id 필터 구독이 INSERT에서도 정확히 동작하도록
--   REPLICA IDENTITY FULL을 함께 설정한다.
-- ───────────────────────────────────────────
ALTER TABLE staff REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE staff;
