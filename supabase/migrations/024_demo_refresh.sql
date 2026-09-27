-- ───────────────────────────────────────────
-- 데모 호텔 자동 신선화
--
-- 시드를 손으로 돌리는 방식은 시간이 지나면 무너진다. now() 기준으로 심은
-- 체크인 시각은 몇 시간만 지나도 과거가 되고, 7일치 실적은 일주일 뒤 창 밖으로
-- 밀려나 avgMinutes가 다시 NULL이 된다. 언제 누가 들어올지 모르는 데모에서는
-- "심사 직전에 돌린다"는 전제 자체가 성립하지 않는다.
--
-- 그래서 /api/demo가 들어올 때마다 이 함수를 부른다. 필요할 때만 일한다:
--   - 실적 이력이 오래됐으면 통째로 현재 쪽으로 민다 (7일 창 유지)
--   - 긴급 객실이 남아 있으면 아무것도 하지 않는다 (진행 중인 시연을 깨지 않는다)
--   - 시나리오가 소진됐으면 다시 깐다
-- ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_demo_hotel(hotel uuid, force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  newest       timestamptz;
  shift_by     interval;
  urgent_left  int;
  did_shift    boolean := false;
BEGIN
  -- ── 1. 실적 이력을 현재 쪽으로 끌어온다 ──
  -- 직원별 평균 소요 시간은 최근 7일 완료 건으로만 계산된다. 이력이 창 밖으로
  -- 나가면 에이전트가 숙련도를 근거로 쓸 수 없게 되므로 통째로 민다.
  SELECT max(a.completed_at) INTO newest
  FROM assignments a
  JOIN rooms r ON r.id = a.room_id
  WHERE r.hotel_id = hotel AND a.completed_at IS NOT NULL;

  IF newest IS NOT NULL AND newest < now() - interval '20 hours' THEN
    -- 가장 최근 기록이 "어제 오후"쯤에 놓이도록 날짜 단위로 민다
    shift_by := date_trunc('day', now()) - date_trunc('day', newest) - interval '1 day';

    IF shift_by > interval '0' THEN
      UPDATE assignments a
      SET assigned_at  = a.assigned_at  + shift_by,
          completed_at = a.completed_at + shift_by
      FROM rooms r
      WHERE r.id = a.room_id
        AND r.hotel_id = hotel
        AND a.completed_at IS NOT NULL;
      did_shift := true;
    END IF;
  END IF;

  -- ── 2. 아직 처리할 긴급 객실이 남아 있으면 건드리지 않는다 ──
  -- 누군가 시연 중일 수 있다. 판을 다시 까는 것은 시나리오가 소진됐을 때뿐이다.
  SELECT count(*) INTO urgent_left
  FROM rooms r
  WHERE r.hotel_id = hotel
    AND r.deleted_at IS NULL
    AND r.status IN ('dirty', 'cleaning')
    AND r.checkin_time BETWEEN now() AND now() + interval '2 hours'
    AND NOT EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.room_id = r.id AND a.completed_at IS NULL AND a.cancelled_at IS NULL
    );

  -- force가 아니면, 처리할 긴급 객실이 남아 있는 동안은 건드리지 않는다
  IF NOT force AND urgent_left >= 2 THEN
    RETURN jsonb_build_object('reset', false, 'shifted', did_shift, 'urgent', urgent_left);
  END IF;

  -- ── 3. 시나리오를 다시 깐다 ──
  -- 진행 중이던 배정과 지난 활동 기록을 치우고, 새로 들어온 사람이
  -- 빈 패널에서 직접 눌러보게 한다.
  UPDATE assignments a
  SET cancelled_at = now()
  FROM rooms r
  WHERE r.id = a.room_id
    AND r.hotel_id = hotel
    AND a.completed_at IS NULL
    AND a.cancelled_at IS NULL;

  DELETE FROM agent_logs WHERE hotel_id = hotel;

  UPDATE rooms
  SET status = 'done', checkin_time = NULL
  WHERE hotel_id = hotel AND deleted_at IS NULL;

  -- 에이전트가 세 가지를 동시에 판단해야 하는 조합:
  --   201·301  스위트 + 긴급  → 평균 소요가 짧은 직원에게
  --   104·105  같은 층 + 긴급 → 한 직원에게 묶어야 이동이 준다
  --   402·503  여유          → 긴급 객실을 밀어내면 안 된다
  UPDATE rooms r
  SET status = 'dirty',
      checkin_time = now() + (m.mins || ' minutes')::interval
  FROM (VALUES
    ('201', 70), ('301', 95), ('104', 85), ('105', 110), ('402', 300), ('503', 360)
  ) AS m(num, mins)
  WHERE r.hotel_id = hotel AND r.number = m.num AND r.deleted_at IS NULL;

  -- 진행 중인 작업 — 직원별 작업량을 일부러 불균등하게 둔다
  UPDATE rooms
  SET status = 'cleaning', checkin_time = now() + interval '3 hours'
  WHERE hotel_id = hotel
    AND deleted_at IS NULL
    AND number IN ('102', '205', '308', '405', '502');

  INSERT INTO assignments (room_id, staff_id, is_guest, assigned_at)
  SELECT r.id, s.id, false, now() - (m.mins || ' minutes')::interval
  FROM (VALUES
    ('102', '김민지', 25), ('205', '김민지', 12), ('308', '최준호', 40),
    ('405', '최준호', 18), ('502', '박서준', 33)
  ) AS m(num, staff_name, mins)
  JOIN rooms r ON r.number = m.num AND r.hotel_id = hotel AND r.deleted_at IS NULL
  JOIN staff s ON s.name = m.staff_name AND s.hotel_id = hotel;

  UPDATE rooms
  SET status = 'inspect'
  WHERE hotel_id = hotel
    AND deleted_at IS NULL
    AND number IN ('107', '209', '305', '409', '505');

  -- 체크인 칸이 전부 비어 있으면 죽은 데이터처럼 보인다
  UPDATE rooms
  SET checkin_time = now() + ((3 + (pick.rn % 6)) || ' hours')::interval
  FROM (
    SELECT number, ROW_NUMBER() OVER (ORDER BY number) AS rn
    FROM rooms
    WHERE hotel_id = hotel AND deleted_at IS NULL AND status = 'done'
    LIMIT 10
  ) AS pick
  WHERE rooms.number = pick.number AND rooms.hotel_id = hotel;

  RETURN jsonb_build_object('reset', true, 'shifted', did_shift, 'urgent', 4, 'forced', force);
END;
$$;

-- service role만 호출한다 (/api/demo 라우트). 그 외에는 실행 권한이 없다.
REVOKE ALL ON FUNCTION refresh_demo_hotel(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION refresh_demo_hotel(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION refresh_demo_hotel(uuid, boolean) FROM authenticated;
