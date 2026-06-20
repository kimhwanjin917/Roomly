# Roomly 환경변수 목록

> `.env.local` 파일에 저장. 절대 git에 커밋하지 않는다.

---

## Supabase

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 클라이언트 (공개 가능) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트용 anon 키 (RLS 적용됨) | 클라이언트 (공개 가능) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 사이드 전용. RLS 우회 가능 | 서버만 (**절대 클라이언트 노출 금지**) |

---

## 인증

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `JWT_SECRET` | 직원 QR·게스트 JWT 발급·검증 시크릿. **Supabase 대시보드 Settings > API > JWT Secret 값과 동일하게 설정** (다른 값 사용 시 RLS 동작 안 함) | 서버만 (**절대 클라이언트 노출 금지**) |

---

## 앱 설정

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `NEXT_PUBLIC_APP_URL` | 배포된 서비스 URL (QR 링크 생성에 사용) | 클라이언트 |
| `NEXT_PUBLIC_CHECKIN_ALERT_MINUTES` | 긴급 알림·긴급 표시 기준 시간 (기본값: 120, 단위: 분). 클라이언트 UI에서 체크인 임박 강조 렌더링에도 사용하므로 `NEXT_PUBLIC_` 접두사 필요 | 클라이언트 + 서버 |

---

## 브라우저 푸시 알림 (Web Push / VAPID)

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push 구독 시 클라이언트에 전달하는 VAPID 공개키 | 클라이언트 (공개 가능) |
| `VAPID_PRIVATE_KEY` | 서버에서 푸시 알림 발송 시 서명에 사용하는 VAPID 개인키 | 서버만 (**절대 클라이언트 노출 금지**) |
| `VAPID_SUBJECT` | VAPID 식별자 (보통 `mailto:관리자이메일` 형식) | 서버만 |

---

## `.env.local` 파일 예시

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 인증 (Supabase Settings > API > JWT Secret 값과 동일하게 설정)
JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 앱
NEXT_PUBLIC_APP_URL=https://roomly.vercel.app
NEXT_PUBLIC_CHECKIN_ALERT_MINUTES=120

# 브라우저 푸시 알림 (VAPID 키 쌍 — npx web-push generate-vapid-keys 로 생성)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:admin@roomly.app

# 추후 구현 — 외부 알림 연동 시 추가
# KAKAO_API_KEY=
# KAKAO_SENDER_KEY=
# KAKAO_TEMPLATE_ID_ASSIGNED=
# KAKAO_TEMPLATE_ID_URGENT=
```

---

## 필수 패키지

```bash
# Supabase — Next.js 14 App Router에서 서버 컴포넌트·미들웨어 세션 처리에 필수
npm install @supabase/supabase-js @supabase/ssr

# 커스텀 JWT 발급·검증 (직원 QR, 게스트)
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken

# 브라우저 푸시 알림 발송
npm install web-push
npm install --save-dev @types/web-push

# QR 코드 생성 (클라이언트에서 QR 이미지 렌더링)
npm install qrcode
npm install --save-dev @types/qrcode

# PWA (Service Worker + 오프라인 캐시)
npm install next-pwa
```

> `@supabase/ssr` 없이 `@supabase/supabase-js`만 쓰면 App Router 서버 컴포넌트·미들웨어에서  
> 세션 쿠키를 읽지 못해 관리자 인증이 동작하지 않음. 반드시 함께 설치.

---

## `.gitignore` 필수 확인

```
.env.local
.env*.local
```

---

## PWA 설정

### manifest.json 최소 스펙

`public/manifest.json` 에 위치:

```json
{
  "name": "Roomly",
  "short_name": "Roomly",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a1a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker 캐시 전략

```
캐시 대상 (Network First — 네트워크 우선, 실패 시 캐시 반환):
  - /worker/[staffId] 페이지 HTML
  - /api/worker/rooms 응답 (배정 목록)

캐시 제외:
  - /admin/* (관리자 화면은 오프라인 지원 불필요)
  - /api/admin/* (관리자 API 캐시 불필요)
  - /api/auth/* (인증 API는 캐시하면 보안 위험)
```

> Next.js에서 PWA 구현 시 `next-pwa` 패키지 사용 권장:  
> `npm install next-pwa`  
> `next.config.js`에서 `withPWA` 래퍼로 설정

---

## Vercel 배포 시

Vercel 대시보드 → Settings → Environment Variables에 동일하게 등록  
`NEXT_PUBLIC_` 접두사가 붙은 변수만 클라이언트 번들에 포함됨
