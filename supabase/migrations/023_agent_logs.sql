-- ───────────────────────────────────────────
-- 하우스키핑 에이전트 활동 로그
--
-- 에이전트가 한 사이클(관찰 → 계획 → 검증 → 실행) 동안 한 일을 순서대로 남긴다.
-- 관리자 대시보드의 활동 패널이 이 테이블을 읽는다.
-- 검증에서 거부된 계획도 기록한다 — 에이전트가 자기 판단을 되돌린 흔적이
-- 남아야 관리자가 위임 여부를 판단할 수 있다.
-- ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  -- 한 번의 실행에 속한 로그를 묶는 키. 화면에서 사이클 단위로 접을 때 쓴다
  cycle_id   uuid NOT NULL,
  -- observe | plan | reject | assign | alert | error
  kind       text NOT NULL,
  message    text NOT NULL,
  -- 도구 입출력 원본. 디버깅과 사후 검증(예측 대비 실제)에 쓴다
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_logs_hotel_created_idx
  ON agent_logs (hotel_id, created_at DESC);

-- 정책 없음 = service role 전용 (payment_logs, email_logs와 동일한 의도).
-- 관리자는 /api/admin/agent 라우트를 통해서만 읽는다.
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
