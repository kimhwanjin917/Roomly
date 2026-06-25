# Roomly DB 스키마 (DDL)

> Supabase(PostgreSQL) 마이그레이션에 바로 사용 가능한 DDL.  
> 실행 순서: hotels → rooms → staff → assignments → guest_codes → room_logs → push_subscriptions

---

## CREATE TABLE

```sql
-- ───────────────────────────────────────────
-- 1. hotels
-- ───────────────────────────────────────────
CREATE TABLE hotels (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  subscription_plan TEXT        NOT NULL DEFAULT 'starter'
                                CHECK (subscription_plan IN ('starter', 'standard', 'pro')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- 2. rooms
-- ───────────────────────────────────────────
CREATE TABLE rooms (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  number       TEXT        NOT NULL,                         -- "302", "1201" 등 표시용 문자열
  floor        INTEGER     NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'double'
                           CHECK (type IN ('single', 'double', 'suite', 'other')),
  status       TEXT        NOT NULL DEFAULT 'dirty'
                           CHECK (status IN ('dirty', 'cleaning', 'done', 'inspect')),
  checkin_time TIMESTAMPTZ,                                  -- NULL 허용: 미입력 방은 긴급 표시 제외
  deleted_at   TIMESTAMPTZ,                                  -- 소프트 삭제용. NULL = 활성, 값 있음 = 삭제됨
  UNIQUE (hotel_id, number)                                  -- 같은 호텔 내 호수 중복 불가
);
-- ⚠️ 물리 삭제 금지: 객실 삭제는 반드시 deleted_at = now() 업데이트로 처리.
-- 이유: room_logs·assignments ON DELETE CASCADE이므로 물리 삭제 시 이력 전체 소멸.
-- 모든 객실 조회 쿼리는 WHERE deleted_at IS NULL 조건 필수.

-- ───────────────────────────────────────────
-- 3. staff
-- ───────────────────────────────────────────
CREATE TABLE staff (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID    NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  role         TEXT    NOT NULL DEFAULT 'housekeeping'
                       CHECK (role IN ('housekeeping', 'dirty')),
  -- 'housekeeping': 일반 하우스키핑 직원 → /worker/[staffId] 화면
  -- 'dirty': Dirty Worker (체크아웃 후 더티 처리 전담) → /worker/dirty/[staffId] 화면
  -- 관리자는 Supabase Auth app_metadata.role = 'admin' 으로만 관리하며 staff row를 갖지 않음.
  auth_id      UUID    NOT NULL UNIQUE,  -- 직원 등록 시 서버가 생성한 UUID. QR JWT의 sub 클레임 = auth.uid()
  phone_number TEXT,                     -- 추후 외부 알림 연동 시 사용, NULL 허용
  qr_version   INTEGER NOT NULL DEFAULT 1
);

-- ───────────────────────────────────────────
-- 4. assignments
-- ───────────────────────────────────────────
CREATE TABLE assignments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  staff_id     UUID        REFERENCES staff(id) ON DELETE RESTRICT,  -- 직원 삭제 전 API에서 cancelled_at 처리 후 삭제
  is_guest     BOOLEAN     NOT NULL DEFAULT false,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,   -- 청소 완료 시각. 직원별 평균 처리 시간 집계에 사용
  cancelled_at TIMESTAMPTZ,   -- 재배정으로 취소된 시각. completed_at과 의미 분리
  CHECK (
    cancelled_at IS NOT NULL                              -- 취소된 배정은 staff_id NULL 허용
    OR (is_guest = true  AND staff_id IS NULL)
    OR (is_guest = false AND staff_id IS NOT NULL)
  )
);

-- ───────────────────────────────────────────
-- 5. guest_codes
-- ───────────────────────────────────────────
CREATE TABLE guest_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  code       TEXT        NOT NULL,           -- 6자리 랜덤 숫자 문자열
  date       DATE        NOT NULL DEFAULT CURRENT_DATE,  -- 코드가 유효한 날짜 (KST)
  expires_at TIMESTAMPTZ NOT NULL,           -- 당일 자정 (KST 기준 UTC+9 15:00)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, date)                    -- 호텔별 날짜당 코드 1개. UPSERT ON CONFLICT 기준
);

-- ───────────────────────────────────────────
-- 6. room_logs
-- ───────────────────────────────────────────
CREATE TABLE room_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL CHECK (status IN ('dirty', 'cleaning', 'done', 'inspect')),
  changed_by TEXT        NOT NULL,   -- staff.id (UUID 문자열) 또는 'guest' (게스트 변경 시)
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  memo       TEXT,                   -- NULL 허용: 직원이 선택적으로 입력
  alert_type TEXT        CHECK (alert_type IN ('urgent_2h', 'overdue'))
             -- NULL: 알림 없음
             -- 'urgent_2h': 체크인 2시간 전 긴급 알림 발송 기록
             -- 'overdue'  : 체크인 시각 초과 미완료 알림 발송 기록
             -- 중복 방지: 같은 room_id + alert_type 조합이 이미 있으면 스킵
);

-- ───────────────────────────────────────────
-- 7. push_subscriptions
-- (기획서 원본에 없었으나 브라우저 푸시 알림 발송에 필수)
-- ───────────────────────────────────────────
CREATE TABLE push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  staff_id   UUID        REFERENCES staff(id) ON DELETE CASCADE,  -- NULL이면 관리자 구독
  is_admin   BOOLEAN     NOT NULL DEFAULT false,
  endpoint   TEXT        NOT NULL UNIQUE,   -- Web Push 구독 endpoint URL
  p256dh     TEXT        NOT NULL,          -- 암호화 공개키
  auth_key   TEXT        NOT NULL,          -- 인증 시크릿
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 인덱스

```sql
-- rooms: 현황판 조회 (hotel_id + status), 긴급 알림 폴링 (checkin_time), 소프트 삭제 필터
CREATE INDEX idx_rooms_hotel_id        ON rooms (hotel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rooms_hotel_status    ON rooms (hotel_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_rooms_checkin_time    ON rooms (checkin_time) WHERE checkin_time IS NOT NULL AND deleted_at IS NULL;

-- assignments: 직원별 배정 목록 조회, 활성 배정 필터
CREATE INDEX idx_assignments_room_id   ON assignments (room_id);
CREATE INDEX idx_assignments_staff_id  ON assignments (staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX idx_assignments_active    ON assignments (room_id)
  WHERE completed_at IS NULL AND cancelled_at IS NULL;

-- guest_codes: 코드 검증 쿼리
CREATE INDEX idx_guest_codes_hotel     ON guest_codes (hotel_id, expires_at);

-- room_logs: 통계 쿼리 (날짜 범위), 긴급 알림 중복 체크
CREATE INDEX idx_room_logs_room_id     ON room_logs (room_id);
CREATE INDEX idx_room_logs_changed_at  ON room_logs (changed_at);
CREATE INDEX idx_room_logs_alert       ON room_logs (room_id, alert_type) WHERE alert_type IS NOT NULL;

-- push_subscriptions: 직원별·관리자별 발송 대상 조회
CREATE INDEX idx_push_hotel_admin      ON push_subscriptions (hotel_id) WHERE is_admin = true;
CREATE INDEX idx_push_staff_id         ON push_subscriptions (staff_id) WHERE staff_id IS NOT NULL;
```

---

## 상태값 정리

| 테이블 | 컬럼 | 허용값 |
|--------|------|--------|
| hotels | subscription_plan | `starter` \| `standard` \| `pro` |
| rooms | type | `single` \| `double` \| `suite` \| `other` |
| rooms | status | `dirty` \| `cleaning` \| `done` \| `inspect` |
| staff | role | `housekeeping` \| `dirty` |
| room_logs | status | `dirty` \| `cleaning` \| `done` \| `inspect` |
| room_logs | alert_type | `urgent_2h` \| `overdue` \| NULL |

---

## 설계 결정 메모

- `rooms.deleted_at`: 소프트 삭제 컬럼. 물리 삭제 금지. room_logs·assignments가 CASCADE이므로 물리 삭제 시 이력 전체 소멸. 모든 rooms 조회에 `WHERE deleted_at IS NULL` 필수
- `rooms.number`는 TEXT: "302", "B1" 등 문자 포함 호수 대응
- `rooms.priority` 컬럼 없음: `ORDER BY checkin_time ASC NULLS LAST`로 대체
- `hotels.total_rooms` 없음: `SELECT COUNT(*) FROM rooms WHERE hotel_id = ?`로 대체 (동기화 문제 방지)
- `assignments.staff_id`는 ON DELETE RESTRICT: 직원 삭제 전 API에서 반드시 cancelled_at 처리 완료 후 삭제. SET NULL 대신 RESTRICT를 쓰는 이유는 SET NULL 시 is_guest=false + staff_id=NULL 조합이 CHECK 위반을 일으키기 때문
- `assignments` CHECK: `cancelled_at IS NOT NULL` 조건을 첫 번째에 배치해 취소된 배정은 staff_id 값과 무관하게 허용
- `guest_codes.date`: UPSERT ON CONFLICT (hotel_id, date)로 당일 코드를 덮어쓰기 위해 필요. 날짜 없이 UNIQUE (hotel_id, code)만 두면 새 코드 발급 시 ON CONFLICT 조건이 불명확해 중복 row 생성됨
- `room_logs`는 UPDATE/DELETE 정책 없음 (감사 추적 목적, 불변)
- `push_subscriptions.endpoint`는 UNIQUE: 동일 브라우저 중복 구독 방지
