-- ───────────────────────────────────────────
-- T-083: 이메일 발송 로그 테이블
-- lib/email.ts sendEmail()이 성공/실패를 모두 기록.
-- trial-ending 크론의 같은 날 중복 발송 방지 조회에도 사용.
-- ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID        REFERENCES hotels(id) ON DELETE SET NULL,
  to_email      TEXT        NOT NULL,
  subject       TEXT        NOT NULL,
  status        TEXT        NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_hotel_created
  ON email_logs (hotel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_failed
  ON email_logs (status, created_at DESC)
  WHERE status = 'failed';

-- RLS: 정책 없이 활성화만 → anon/authenticated 차단, service role 전용
-- (010_payment_logs.sql과 동일한 패턴)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
