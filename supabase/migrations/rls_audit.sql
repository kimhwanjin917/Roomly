-- ============================================================
-- T-161: RLS 감사 (Row Level Security Audit)
--
-- 목적: 모든 public 테이블의 RLS 활성화 여부를 점검하고,
--       누락 테이블을 idempotent하게 보완한다.
--
-- 감사 결과 (2026-07 기준, 마이그레이션 001~014 + 012_email_logs 검토):
--
-- │ 테이블               │ RLS 활성화 위치        │ 정책                          │
-- ├──────────────────────┼────────────────────────┼───────────────────────────────┤
-- │ hotels               │ 002_rls.sql            │ 관리자 SELECT, org_admin(014) │
-- │ rooms                │ 002_rls.sql            │ 관리자/직원/게스트 CRUD       │
-- │ staff                │ 002_rls.sql            │ 관리자 CRUD, 직원 본인 SELECT │
-- │ assignments          │ 002_rls.sql            │ 관리자/직원/게스트            │
-- │ guest_codes          │ 002_rls.sql            │ 관리자 ALL                    │
-- │ room_logs            │ 002_rls.sql            │ 관리자 SELECT, 직원 INSERT    │
-- │ push_subscriptions   │ 002_rls.sql + 003      │ 직원/관리자 ALL               │
-- │ supplies             │ 005_supplies.sql       │ hotel_id 격리                 │
-- │ supply_requests      │ 005_supplies.sql       │ hotel_id 격리                 │
-- │ maintenance_requests │ 006_maintenance.sql    │ hotel_id 격리                 │
-- │ api_keys             │ 008_api_keys.sql       │ hotel_id 격리                 │
-- │ payment_logs         │ 010_payment_logs.sql   │ 정책 없음 = service role 전용 │
-- │ email_logs           │ 012_email_logs.sql     │ 정책 없음 = service role 전용 │
-- │ organizations        │ 014_organizations.sql  │ org_admin SELECT              │
--
-- 결론: 모든 테이블이 RLS 활성화 상태. 아래 ENABLE 구문은 idempotent
--       안전망으로, 마이그레이션 순서가 꼬였거나 테이블이 재생성됐을 때를
--       대비한다. (RLS 미활성 + 정책 없음 = 전체 공개가 최악의 시나리오)
--       기존 정책은 변경하지 않는다.
-- ============================================================

-- ───────────────────────────────────────────
-- 1. 점검 쿼리: RLS가 꺼져 있는 public 테이블 목록
--    (결과가 0행이어야 정상)
-- ───────────────────────────────────────────
SELECT
  c.relname                                   AS table_name,
  c.relrowsecurity                            AS rls_enabled,
  (SELECT count(*) FROM pg_policies p
   WHERE p.schemaname = 'public'
     AND p.tablename = c.relname)             AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- 참고: RLS는 켜져 있으나 정책이 0개인 테이블 목록 (= service role 전용, 의도된 상태)
-- payment_logs, email_logs가 여기에 나오는 것이 정상.
SELECT
  c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY c.relname;

-- ───────────────────────────────────────────
-- 2. RLS 활성화 보완 (idempotent — 이미 켜져 있으면 no-op)
-- ───────────────────────────────────────────
ALTER TABLE IF EXISTS hotels               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rooms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guest_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS room_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supply_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS api_keys             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_logs         ENABLE ROW LEVEL SECURITY;  -- 정책 없음 = service role 전용 (의도)
ALTER TABLE IF EXISTS email_logs           ENABLE ROW LEVEL SECURITY;  -- 정책 없음 = service role 전용 (의도)
ALTER TABLE IF EXISTS organizations        ENABLE ROW LEVEL SECURITY;
