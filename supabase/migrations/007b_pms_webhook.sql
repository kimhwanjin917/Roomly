-- hotels 테이블에 webhook_secret 컬럼 추가
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
