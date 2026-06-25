-- Migration: staff 테이블에 role 컬럼 추가
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 실행 시점: Dirty Worker 기능 배포 전 반드시 실행

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'housekeeping'
  CHECK (role IN ('housekeeping', 'dirty'));

-- 기존 직원은 모두 housekeeping으로 초기화됨 (DEFAULT 값)
-- 확인 쿼리:
-- SELECT id, name, role FROM staff ORDER BY created_at;
