-- 011_settings.sql
-- T-058: 관리자 설정 — 체크인 긴급 알림 기준 시간(분) + 약관 동의 시각

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS checkin_alert_minutes INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS agreed_terms_at TIMESTAMPTZ;

COMMENT ON COLUMN hotels.checkin_alert_minutes IS '체크인 몇 분 전부터 긴급 알림을 표시/발송할지 (30~480분)';
COMMENT ON COLUMN hotels.agreed_terms_at IS '이용약관 동의 시각';
