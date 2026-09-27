-- ───────────────────────────────────────────
-- 데모 호텔 리셋 — 심사/시연 직전에 돌린다.
--
-- 평소에는 돌릴 일이 없다. /api/demo가 들어올 때마다 refresh_demo_hotel()을
-- 호출해 스스로 맞추기 때문이다 (supabase/migrations/024_demo_refresh.sql).
-- 이 파일은 그 함수가 없거나, 데모 호텔을 처음부터 다시 깔 때 쓰는 수동 판이다.
--
-- Supabase SQL Editor에 통째로 붙여넣고 Run.
-- 대상은 'Roomly 데모 호텔' 하나뿐이다. 다른 호텔은 건드리지 않는다.
--
-- 목적: 에이전트가 판단할 근거를 화면에 만들어 준다.
--   - 직원별 7일 실적 (숙련도 차이) → get_staff_performance가 avgMinutes를 돌려준다
--   - 체크인 임박 객실 → urgent 우선순위 판단
--   - 같은 층에 몰린 객실 → 이동 최소화 판단
--   - 직원별 현재 작업량 편차 → 부하 분산 판단
-- 이 네 가지가 있어야 에이전트 배정 사유가 한 줄짜리 변명이 아니라 근거가 된다.
-- ───────────────────────────────────────────

BEGIN;

-- ── 0. 기존 상태 정리 ──────────────────────
DELETE FROM assignments
WHERE room_id IN (
  SELECT id FROM rooms WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4'
);

DELETE FROM agent_logs WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4';

-- ── 1. 직원별 7일 완료 이력 ────────────────
-- 직원마다 평균 소요 시간을 다르게 심는다. 이 차이가 에이전트의 판단 근거다.
--   이하늘 22분(최속) < 김다정 26 < 박서준 30 < 김민지 33 < 조형준 35 < 최준호 38(최저속)
-- 6명 × 7일 × 3건 = 126건
WITH profile AS (
  SELECT s.id,
         CASE s.name
           WHEN '이하늘' THEN 22
           WHEN '김다정' THEN 26
           WHEN '박서준' THEN 30
           WHEN '김민지' THEN 33
           WHEN '조형준' THEN 35
           ELSE 38
         END AS base_min
  FROM staff s
  WHERE s.hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4'
),
slots AS (
  SELECT p.id AS staff_id, p.base_min, d.day_offset
  FROM profile p
  CROSS JOIN generate_series(1, 7) AS d(day_offset)
  CROSS JOIN generate_series(1, 3) AS n(seq)
)
INSERT INTO assignments (room_id, staff_id, is_guest, assigned_at, completed_at)
SELECT
  (SELECT r.id FROM rooms r
    WHERE r.hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4' AND r.deleted_at IS NULL
    ORDER BY random() LIMIT 1),
  s.staff_id,
  false,
  t.started,
  -- ±4분 흔들어 평균이 딱 떨어지지 않게 한다
  t.started + make_interval(mins => GREATEST(10, s.base_min + (random() * 8 - 4)::int))
FROM slots s
CROSS JOIN LATERAL (
  SELECT date_trunc('day', now()) - make_interval(days => s.day_offset)
         + interval '9 hours' + (random() * interval '8 hours') AS started
) t;

-- ── 2. 객실 상태 초기화 ────────────────────
-- 일단 전부 완료 + 체크인 없음으로 밀고, 아래에서 버킷별로 덮어쓴다.
UPDATE rooms
SET status = 'done', checkin_time = NULL
WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4' AND deleted_at IS NULL;

-- ── 3. 에이전트가 처리할 미배정 객실 6개 ───
-- 세 가지 판단이 전부 필요하도록 고른 조합이다.
--   201·301  스위트 + 긴급   → 평균 소요가 짧은 직원에게 줘야 한다
--   104·105  같은 층 + 긴급  → 한 직원에게 묶어야 이동이 준다
--   402·503  여유           → 긴급 객실을 밀어내면 안 된다
UPDATE rooms SET status = 'dirty', checkin_time = now() + interval '70 minutes'
  WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4' AND number = '201';
UPDATE rooms SET status = 'dirty', checkin_time = now() + interval '95 minutes'
  WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4' AND number = '301';
UPDATE rooms SET status = 'dirty', checkin_time = now() + interval '85 minutes'
  WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4' AND number = '104';
UPDATE rooms SET status = 'dirty', checkin_time = now() + interval '110 minutes'
  WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4' AND number = '105';
UPDATE rooms SET status = 'dirty', checkin_time = now() + interval '5 hours'
  WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4' AND number = '402';
UPDATE rooms SET status = 'dirty', checkin_time = now() + interval '6 hours'
  WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4' AND number = '503';

-- ── 4. 이미 진행 중인 작업 ─────────────────
-- 직원별 현재 작업량을 불균등하게 만든다. 에이전트가 한가한 직원을 고르는 근거.
--   김민지 2건 / 최준호 2건 / 박서준 1건 → 나머지 3명은 여유
UPDATE rooms SET status = 'cleaning', checkin_time = now() + interval '3 hours'
  WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4'
    AND number IN ('102', '205', '308', '405', '502');

INSERT INTO assignments (room_id, staff_id, is_guest, assigned_at)
SELECT r.id, s.id, false, now() - make_interval(mins => m.mins)
FROM (VALUES
  ('102', '김민지', 25),
  ('205', '김민지', 12),
  ('308', '최준호', 40),
  ('405', '최준호', 18),
  ('502', '박서준', 33)
) AS m(room_number, staff_name, mins)
JOIN rooms r ON r.number = m.room_number
             AND r.hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4'
JOIN staff s ON s.name = m.staff_name
             AND s.hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4';

-- ── 5. 점검 대기 ───────────────────────────
UPDATE rooms SET status = 'inspect'
WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4'
  AND number IN ('107', '209', '305', '409', '505');

-- ── 6. 오늘 남은 체크인 (여유 있는 완료 객실) ──
-- 현황판 체크인 칸이 전부 "—"이면 죽은 데이터처럼 보인다.
UPDATE rooms
SET checkin_time = now() + make_interval(hours => 3 + (ordinality % 6))
FROM (
  SELECT number, ROW_NUMBER() OVER (ORDER BY number) AS ordinality
  FROM rooms
  WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4'
    AND deleted_at IS NULL
    AND status = 'done'
  LIMIT 10
) AS pick
WHERE rooms.number = pick.number
  AND rooms.hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4';

COMMIT;

-- ── 확인 ───────────────────────────────────
SELECT
  count(*) FILTER (WHERE status = 'dirty')    AS dirty,
  count(*) FILTER (WHERE status = 'cleaning') AS cleaning,
  count(*) FILTER (WHERE status = 'done')     AS done,
  count(*) FILTER (WHERE status = 'inspect')  AS inspect,
  count(*) FILTER (WHERE checkin_time IS NOT NULL AND checkin_time < now()) AS checkin_past
FROM rooms
WHERE hotel_id = 'b7cf4b1b-5952-4844-8f53-30b4e8e9f5b4' AND deleted_at IS NULL;
