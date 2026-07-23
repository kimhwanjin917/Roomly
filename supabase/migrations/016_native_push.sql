-- T-205: 네이티브 앱(FCM) 푸시 구독 지원
-- platform: 'web' = Web Push(VAPID), 'fcm' = 네이티브 앱(FCM 토큰)
-- FCM 구독은 endpoint에 'fcm:{token}'을 저장해 기존 UNIQUE(endpoint) 중복 방지를 재사용한다.
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- FCM 구독은 p256dh/auth가 없으므로 NOT NULL 해제
ALTER TABLE push_subscriptions ALTER COLUMN p256dh DROP NOT NULL;
ALTER TABLE push_subscriptions ALTER COLUMN auth DROP NOT NULL;
