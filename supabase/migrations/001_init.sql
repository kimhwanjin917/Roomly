-- ============================================================
-- Roomly — 초기 스키마 마이그레이션
-- Supabase SQL Editor에서 순서대로 실행
-- ============================================================

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
  number       TEXT        NOT NULL,
  floor        INTEGER     NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'double'
                           CHECK (type IN ('single', 'double', 'suite', 'other')),
  status       TEXT        NOT NULL DEFAULT 'dirty'
                           CHECK (status IN ('dirty', 'cleaning', 'done', 'inspect')),
  checkin_time TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ,
  UNIQUE (hotel_id, number)
);
-- ⚠️ 물리 삭제 금지: deleted_at = now() 소프트 삭제로만 처리
-- 모든 rooms 조회에 WHERE deleted_at IS NULL 조건 필수

-- ───────────────────────────────────────────
-- 3. staff
-- ───────────────────────────────────────────
CREATE TABLE staff (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID    NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  -- role 컬럼 없음: worker 전용. 관리자는 app_metadata.role = 'admin'
  auth_id      UUID    NOT NULL UNIQUE,
  phone_number TEXT,
  qr_version   INTEGER NOT NULL DEFAULT 1
);

-- ───────────────────────────────────────────
-- 4. assignments
-- ───────────────────────────────────────────
CREATE TABLE assignments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  staff_id     UUID        REFERENCES staff(id) ON DELETE RESTRICT,
  is_guest     BOOLEAN     NOT NULL DEFAULT false,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  CHECK (
    cancelled_at IS NOT NULL
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
  code       TEXT        NOT NULL,
  date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, date)
);

-- ───────────────────────────────────────────
-- 6. room_logs
-- ───────────────────────────────────────────
CREATE TABLE room_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL CHECK (status IN ('dirty', 'cleaning', 'done', 'inspect')),
  changed_by TEXT        NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  memo       TEXT,
  alert_type TEXT        CHECK (alert_type IN ('urgent_2h', 'overdue'))
);

-- ───────────────────────────────────────────
-- 7. push_subscriptions
-- ───────────────────────────────────────────
CREATE TABLE push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  staff_id   UUID        REFERENCES staff(id) ON DELETE CASCADE,
  is_admin   BOOLEAN     NOT NULL DEFAULT false,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth_key   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- 인덱스
-- ───────────────────────────────────────────
CREATE INDEX idx_rooms_hotel_id        ON rooms (hotel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rooms_hotel_status    ON rooms (hotel_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_rooms_checkin_time    ON rooms (checkin_time) WHERE checkin_time IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_assignments_room_id   ON assignments (room_id);
CREATE INDEX idx_assignments_staff_id  ON assignments (staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX idx_assignments_active    ON assignments (room_id)
  WHERE completed_at IS NULL AND cancelled_at IS NULL;

CREATE INDEX idx_guest_codes_hotel     ON guest_codes (hotel_id, expires_at);

CREATE INDEX idx_room_logs_room_id     ON room_logs (room_id);
CREATE INDEX idx_room_logs_changed_at  ON room_logs (changed_at);
CREATE INDEX idx_room_logs_alert       ON room_logs (room_id, alert_type) WHERE alert_type IS NOT NULL;

CREATE INDEX idx_push_hotel_admin      ON push_subscriptions (hotel_id) WHERE is_admin = true;
CREATE INDEX idx_push_staff_id         ON push_subscriptions (staff_id) WHERE staff_id IS NOT NULL;
