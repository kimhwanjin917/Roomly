-- ============================================================
-- Roomly — 체인 호텔 법인(조직) 계정
-- organizations 테이블 + hotels.org_id + org_admin RLS 정책
-- ⚠️ org_admin 계정은 Supabase 대시보드에서 수동 생성 필요:
--    auth.users 생성 후 app_metadata에
--    { "role": "org_admin", "org_id": "<organizations.id>" } 설정
-- ============================================================

-- ───────────────────────────────────────────
-- 1. organizations
-- ───────────────────────────────────────────
CREATE TABLE organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  plan       TEXT        DEFAULT 'enterprise',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ───────────────────────────────────────────
-- 2. hotels.org_id (체인 소속 호텔 연결, NULL = 독립 호텔)
-- ───────────────────────────────────────────
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_hotels_org_id ON hotels (org_id) WHERE org_id IS NOT NULL;

-- ───────────────────────────────────────────
-- 3. RLS
-- ───────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 조직 관리자(org_admin)는 자기 조직만 조회 가능
CREATE POLICY "조직 관리자 자기 조직 조회"
ON organizations FOR SELECT
USING (
  id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'org_admin'
);

-- 조직 관리자는 소속 호텔 조회 가능
-- (기존 "관리자 자기 호텔 조회" 정책은 변경하지 않고 별도 정책으로 추가)
CREATE POLICY "조직 관리자 소속 호텔 조회"
ON hotels FOR SELECT
USING (
  org_id IS NOT NULL
  AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'org_admin'
);
