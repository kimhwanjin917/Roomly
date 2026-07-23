-- ───────────────────────────────────────────
-- 013. staff.role — 직원 역할 (T-015)
--   housekeeping: 객실 청소 담당 (기본값)
--   dirty:        체크아웃 방 더티 처리 전담
-- ───────────────────────────────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'housekeeping'
  CHECK (role IN ('housekeeping', 'dirty'));
