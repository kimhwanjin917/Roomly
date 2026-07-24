-- 008: supply_id를 nullable로 변경 (직원 자유 요청 지원)
ALTER TABLE supply_requests ALTER COLUMN supply_id DROP NOT NULL;

-- 직원이 서비스 클라이언트를 통해 비품 요청 insert 가능 (RLS는 API 레이어에서 처리)
