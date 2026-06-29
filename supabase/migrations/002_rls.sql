-- ============================================================
-- Roomly — RLS (Row Level Security) 정책
-- ⚠️ JWT 클레임은 반드시 app_metadata 아래에 있어야 합니다.
--    (auth.jwt() -> 'app_metadata' ->> 'hotel_id') 형태로 접근
-- ============================================================

-- RLS 활성화
ALTER TABLE hotels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_codes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────
-- hotels
-- ───────────────────────────────────────────
CREATE POLICY "관리자 자기 호텔 조회"
ON hotels FOR SELECT
USING (
  id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ───────────────────────────────────────────
-- rooms
-- ───────────────────────────────────────────
CREATE POLICY "관리자 객실 조회"
ON rooms FOR SELECT
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND deleted_at IS NULL
);

CREATE POLICY "직원 객실 조회"
ON rooms FOR SELECT
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'worker'
  AND deleted_at IS NULL
);

CREATE POLICY "게스트 객실 조회"
ON rooms FOR SELECT
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'guest'
  AND deleted_at IS NULL
  AND id IN (
    SELECT room_id FROM assignments
    WHERE is_guest = true AND completed_at IS NULL AND cancelled_at IS NULL
  )
);

CREATE POLICY "관리자 객실 추가"
ON rooms FOR INSERT
WITH CHECK (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "관리자 객실 수정"
ON rooms FOR UPDATE
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND deleted_at IS NULL
);

CREATE POLICY "직원 배정 객실 수정"
ON rooms FOR UPDATE
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'worker'
  AND deleted_at IS NULL
  AND id IN (
    SELECT room_id FROM assignments
    WHERE staff_id = (auth.jwt() -> 'app_metadata' ->> 'staff_id')::uuid
      AND completed_at IS NULL
      AND cancelled_at IS NULL
  )
);

CREATE POLICY "게스트 객실 상태 변경"
ON rooms FOR UPDATE
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'guest'
  AND deleted_at IS NULL
  AND id IN (
    SELECT room_id FROM assignments
    WHERE is_guest = true AND completed_at IS NULL AND cancelled_at IS NULL
  )
);
-- ⚠️ rooms DELETE 정책 없음: 물리 삭제 금지. deleted_at 소프트 삭제만 허용

-- ───────────────────────────────────────────
-- staff
-- ───────────────────────────────────────────
CREATE POLICY "관리자 직원 전체 조회"
ON staff FOR SELECT
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "직원 본인 조회"
ON staff FOR SELECT
USING (
  auth_id = auth.uid()
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'worker'
);

CREATE POLICY "관리자 직원 추가"
ON staff FOR INSERT
WITH CHECK (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "관리자 직원 수정"
ON staff FOR UPDATE
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "관리자 직원 삭제"
ON staff FOR DELETE
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ───────────────────────────────────────────
-- assignments
-- ───────────────────────────────────────────
CREATE POLICY "관리자 배정 전체 조회"
ON assignments FOR SELECT
USING (
  room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "직원 본인 배정 조회"
ON assignments FOR SELECT
USING (
  staff_id = (auth.jwt() -> 'app_metadata' ->> 'staff_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'worker'
);

CREATE POLICY "게스트 풀 배정 조회"
ON assignments FOR SELECT
USING (
  is_guest = true
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'guest'
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

CREATE POLICY "관리자 배정 생성"
ON assignments FOR INSERT
WITH CHECK (
  room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "관리자 배정 수정"
ON assignments FOR UPDATE
USING (
  room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "직원 배정 완료 처리"
ON assignments FOR UPDATE
USING (
  staff_id = (auth.jwt() -> 'app_metadata' ->> 'staff_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'worker'
);

CREATE POLICY "게스트 배정 완료 처리"
ON assignments FOR UPDATE
USING (
  is_guest = true
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'guest'
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

-- ───────────────────────────────────────────
-- guest_codes
-- ───────────────────────────────────────────
CREATE POLICY "관리자 코드 관리"
ON guest_codes FOR ALL
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ───────────────────────────────────────────
-- room_logs
-- ───────────────────────────────────────────
CREATE POLICY "관리자 로그 조회"
ON room_logs FOR SELECT
USING (
  room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "직원 로그 작성"
ON room_logs FOR INSERT
WITH CHECK (
  room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
  AND (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'worker'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'guest'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
);

-- room_logs UPDATE/DELETE 정책 없음 (감사 추적 목적, 불변)

-- ───────────────────────────────────────────
-- push_subscriptions
-- ───────────────────────────────────────────
CREATE POLICY "직원 본인 구독 관리"
ON push_subscriptions FOR ALL
USING (
  staff_id = (auth.jwt() -> 'app_metadata' ->> 'staff_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'worker'
);

CREATE POLICY "관리자 구독 관리"
ON push_subscriptions FOR ALL
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
