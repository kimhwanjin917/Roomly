-- ───────────────────────────────────────────
-- 020. 일일 근무자 세션 세대(generation) 관리
--
-- 일일 근무자 접속 코드를 재발급하면 새 guest_codes 행이 발급되고,
-- 그 id가 "세대" 표식이 된다.
--   · 일용직 staff는 자신이 가입한 세대(guest_code_id)를 들고 다닌다
--   · 게스트 세션 JWT에도 같은 id가 박히므로, 재발급 즉시 옛 세션은 무효가 된다
--   · 재발급 시 기존 일용직 staff는 전부 삭제되어 새 코드로 다시 가입한다
--
-- room_logs.changed_by는 FK가 없는 TEXT라 일용직을 지워도 작업 이력은 남는다.
-- push_subscriptions.staff_id는 ON DELETE CASCADE라 함께 정리된다.
-- assignments는 게스트 배정(is_guest=true)일 때 staff_id가 NULL이므로 영향이 없다.
-- ───────────────────────────────────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS guest_code_id UUID;

-- 세대별 일용직 조회 (전화번호 재인식 / 재발급 시 일괄 삭제)
CREATE INDEX IF NOT EXISTS idx_staff_temp_generation
  ON staff (hotel_id, guest_code_id)
  WHERE employment_type = 'temp';
