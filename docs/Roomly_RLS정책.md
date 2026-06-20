# Roomly Supabase RLS 정책

> Row Level Security: 호텔별 데이터 격리 + 역할별 접근 제어

---

## 기본 원칙

1. 모든 테이블에 RLS 활성화 (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
2. 관리자는 자기 호텔 데이터만 CRUD 가능
3. 직원은 자기 호텔 데이터 조회 + 자신에게 배정된 방만 상태 변경 가능
4. 호텔 간 데이터 절대 교차 불가

---

## JWT 커스텀 클레임 구조

RLS 정책에서 `auth.jwt() -> 'app_metadata'`로 클레임을 읽기 때문에, **모든 JWT(관리자·직원·게스트)의 커스텀 클레임은 반드시 `app_metadata` 안에 위치해야 한다.**

### 관리자 JWT (Supabase Auth 발급)

운영자가 service_role API로 `app_metadata` 설정 → Supabase가 로그인 시 자동 포함:

```json
{
  "sub": "admin-auth-uuid",
  "role": "authenticated",
  "app_metadata": {
    "hotel_id": "hotel-uuid",
    "role": "admin"
  }
}
```

### 직원 QR JWT / 게스트 JWT (서버 직접 발급)

서버에서 커스텀 JWT 발급 시 **반드시 `app_metadata` 키 안에** 클레임을 포함시켜야 RLS가 정상 동작함:

```json
{
  "sub": "staff.auth_id 값 (직원 등록 시 서버가 생성한 UUID)",
  "role": "authenticated",
  "app_metadata": {
    "hotel_id": "hotel-uuid",
    "role": "worker",
    "staff_id": "staff-uuid",
    "qr_version": 1
  }
}
```

```json
{
  "sub": "guest-session-uuid (임시 생성)",
  "role": "authenticated",
  "app_metadata": {
    "hotel_id": "hotel-uuid",
    "role": "guest"
  }
}
```

> `staff_id`·`qr_version`은 worker만 값이 있음. admin·guest는 생략.  
> `qr_version`: RLS 레벨이 아닌 Next.js 미들웨어에서 `staff.qr_version`과 비교해 불일치 시 401 반환.

> **⚠️ 중요 (구현 시 가장 흔한 실수)**  
> 직원/게스트 커스텀 JWT payload를 `{ "hotel_id": "...", "role": "worker" }` 처럼 flat하게 만들면  
> `auth.jwt() -> 'app_metadata' ->> 'hotel_id'`가 NULL을 반환해 **RLS 정책 전체가 동작하지 않음**.  
> 반드시 `app_metadata` 중첩 구조로 발급할 것.

> **⚠️ 중요**: 직원 QR JWT와 게스트 JWT는 반드시 **Supabase 프로젝트의 JWT Secret**으로 서명해야 Supabase가 검증 가능.  
> → `JWT_SECRET` 환경변수는 Supabase 대시보드 Settings > API > JWT Secret 값과 동일하게 설정

---

## 테이블별 RLS 정책

### hotels

```sql
-- 관리자: 자기 호텔만 조회
CREATE POLICY "관리자 자기 호텔 조회"
ON hotels FOR SELECT
USING (
  id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- INSERT / UPDATE / DELETE: 서비스 계정(service_role)만 허용
-- (호텔 생성은 Supabase 대시보드 또는 서버 사이드에서만)
```

---

### rooms

```sql
-- 관리자: 자기 호텔 활성 객실 전체 조회 (소프트 삭제된 방 제외)
CREATE POLICY "관리자 객실 조회"
ON rooms FOR SELECT
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND deleted_at IS NULL
);

-- 직원: 자기 호텔 활성 객실 조회 (배정 목록 표시용)
CREATE POLICY "직원 객실 조회"
ON rooms FOR SELECT
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'worker'
  AND deleted_at IS NULL
);

-- 관리자: 자기 호텔 활성 객실 수정 (소프트 삭제된 방 수정 불가)
CREATE POLICY "관리자 객실 수정"
ON rooms FOR UPDATE
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND deleted_at IS NULL
);

-- 직원: 자신에게 배정된 활성 객실만 상태 변경
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

-- 관리자: 객실 추가
CREATE POLICY "관리자 객실 추가"
ON rooms FOR INSERT
WITH CHECK (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ⚠️ 물리 삭제 정책 없음: 객실 삭제는 반드시 deleted_at = now() 소프트 삭제로만 처리.
-- DELETE 정책을 두지 않으므로 클라이언트에서 물리 삭제 시도 시 RLS가 차단함.

-- 게스트: 게스트 풀에 배정된 활성 방만 조회
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

-- 게스트: 게스트 풀 활성 방만 상태 변경
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
```

---

### staff

```sql
-- 관리자: 자기 호텔 직원 조회
CREATE POLICY "관리자 직원 조회"
ON staff FOR SELECT
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 관리자: 직원 추가
CREATE POLICY "관리자 직원 추가"
ON staff FOR INSERT
WITH CHECK (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 관리자: 직원 수정
CREATE POLICY "관리자 직원 수정"
ON staff FOR UPDATE
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 관리자: 직원 삭제
CREATE POLICY "관리자 직원 삭제"
ON staff FOR DELETE
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 직원: 자기 자신 정보만 조회
CREATE POLICY "직원 본인 조회"
ON staff FOR SELECT
USING (
  auth_id = auth.uid()
);
```

---

### assignments

```sql
-- 관리자: 자기 호텔 배정 조회
CREATE POLICY "관리자 배정 조회"
ON assignments FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

-- 관리자: 배정 생성
CREATE POLICY "관리자 배정 생성"
ON assignments FOR INSERT
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

-- 관리자: 배정 수정 (재배정, 취소 등)
CREATE POLICY "관리자 배정 수정"
ON assignments FOR UPDATE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

-- 관리자: 배정 삭제
CREATE POLICY "관리자 배정 삭제"
ON assignments FOR DELETE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

-- 직원: 자신에게 배정된 항목만 조회
CREATE POLICY "직원 본인 배정 조회"
ON assignments FOR SELECT
USING (
  staff_id = (auth.jwt() -> 'app_metadata' ->> 'staff_id')::uuid
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

-- 직원: 자신의 배정 completed_at 업데이트 (완료 처리)
CREATE POLICY "직원 완료 처리"
ON assignments FOR UPDATE
USING (
  staff_id = (auth.jwt() -> 'app_metadata' ->> 'staff_id')::uuid
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

-- 게스트: 게스트 풀 배정 목록만 조회
CREATE POLICY "게스트 배정 조회"
ON assignments FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'guest'
  AND is_guest = true
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

-- 게스트: 게스트 풀 방 완료 처리
CREATE POLICY "게스트 완료 처리"
ON assignments FOR UPDATE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'guest'
  AND is_guest = true
  AND room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);
```

---

### room_logs

```sql
-- 관리자: 자기 호텔 로그 전체 조회
CREATE POLICY "관리자 로그 조회"
ON room_logs FOR SELECT
USING (
  room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 관리자 + 직원 + 게스트: 로그 INSERT (상태 변경 시 기록)
CREATE POLICY "로그 기록"
ON room_logs FOR INSERT
WITH CHECK (
  room_id IN (
    SELECT id FROM rooms
    WHERE hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  )
);

-- 로그는 수정/삭제 불가 (감사 추적 목적)
```

---

### guest_codes

```sql
-- 관리자만 코드 생성/조회/삭제
CREATE POLICY "관리자 게스트 코드 관리"
ON guest_codes FOR ALL
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 코드 검증은 service_role로 서버 사이드에서만 처리
```

---

### push_subscriptions

```sql
-- 관리자: 자기 호텔 구독 정보 조회·삽입·삭제
CREATE POLICY "관리자 푸시 구독 관리"
ON push_subscriptions FOR ALL
USING (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 직원: 자기 자신의 구독 정보만 삽입·삭제
CREATE POLICY "직원 푸시 구독 등록"
ON push_subscriptions FOR INSERT
WITH CHECK (
  hotel_id = (auth.jwt() -> 'app_metadata' ->> 'hotel_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'worker'
  AND staff_id = (auth.jwt() -> 'app_metadata' ->> 'staff_id')::uuid
);

CREATE POLICY "직원 푸시 구독 삭제"
ON push_subscriptions FOR DELETE
USING (
  staff_id = (auth.jwt() -> 'app_metadata' ->> 'staff_id')::uuid
);

-- 푸시 발송 자체는 서버(service_role)에서만 처리 — 직원/게스트의 타인 구독 조회 불가
```

---

## 정책 적용 순서 (마이그레이션)

```sql
-- 1. RLS 활성화
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 초기화 (재적용 시)
DROP POLICY IF EXISTS ... ON ...;

-- 3. 위 정책들 순서대로 적용
```

---

## 주의사항

- `service_role` 키는 서버 사이드(Next.js API Route)에서만 사용 — 클라이언트에 절대 노출 금지
- 클라이언트에서는 `anon` 키만 사용, RLS가 모든 접근 제어
- Realtime 구독도 RLS 적용됨 — 별도 설정 불필요
- 직원 QR JWT·게스트 JWT는 Supabase JWT Secret과 동일한 시크릿으로 서명할 것 (위 클레임 구조 참고)
- `room_logs.alert_type`: `'urgent_2h'`(체크인 2시간 전) / `'overdue'`(체크인 초과) / NULL(알림 없음). 두 타입을 구분해 각각 독립적으로 중복 발송 방지. `alert_sent BOOLEAN`은 사용하지 않음
