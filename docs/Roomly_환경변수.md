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

## Resend (이메일)

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `RESEND_API_KEY` | Resend 이메일 발송 API 키 | 서버만 (**절대 클라이언트 노출 금지**) |
| `EMAIL_FROM` | 발신자 주소 (기본값: `Roomly <noreply@roomly.app>`) | 서버만 |

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=Roomly <noreply@roomly.app>
```

> `RESEND_API_KEY`가 없으면 이메일 발송을 건너뜀 (비차단 처리).  
> Resend 대시보드에서 발신 도메인(`roomly.app`) DNS 검증 필요.

---

## 브라우저 푸시 알림 (Web Push / VAPID)

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push 구독 시 클라이언트에 전달하는 VAPID 공개키 | 클라이언트 (공개 가능) |
| `VAPID_PRIVATE_KEY` | 서버에서 푸시 알림 발송 시 서명에 사용하는 VAPID 개인키 | 서버만 (**절대 클라이언트 노출 금지**) |
| `VAPID_SUBJECT` | VAPID 식별자 (보통 `mailto:관리자이메일` 형식) | 서버만 |

### VAPID 키 발급 방법

```bash
npx web-push generate-vapid-keys
```

출력된 값을 `.env.local`에 추가:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<출력된 Public Key>
VAPID_PRIVATE_KEY=<출력된 Private Key>
VAPID_EMAIL=your@email.com
```

> `VAPID_EMAIL`은 `lib/push.ts`에서 `mailto:` 식별자로 사용됨.  
> 기존 `VAPID_SUBJECT` 변수를 쓰던 경우 `VAPID_EMAIL`로 이름을 통일할 것.

---

## 슈퍼어드민

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `SUPER_ADMIN_PASSWORD_HASH` | 슈퍼어드민 로그인 비밀번호의 SHA-256 해시값 | 서버만 (**절대 클라이언트 노출 금지**) |

### 해시 생성 방법

```bash
node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
```

출력된 해시값을 `.env.local`에 추가:

```bash
SUPER_ADMIN_PASSWORD_HASH=<출력된 해시값>
```

> 슈퍼어드민 페이지 URL: `/super-admin` (비밀 경로 — 일반 관리자와 완전 분리된 인증 사용)

---

## `.env.local` 파일 예시

> 최신 전체 예시는 저장소 루트의 `.env.local.example` 참고 (Toss/Cron/Upstash/Sentry/Anthropic 포함).

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

# Resend (이메일)
RESEND_API_KEY=re_...
EMAIL_FROM=Roomly <noreply@roomly.app>

# 브라우저 푸시 알림 (VAPID 키 쌍 — npx web-push generate-vapid-keys 로 생성)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:admin@roomly.app

# 슈퍼어드민 (SHA-256 해시 — node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('YOUR_PASSWORD').digest('hex'))")
SUPER_ADMIN_PASSWORD_HASH=<해시값>

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

# 이메일 발송 (Resend + React Email)
npm install resend react-email @react-email/components
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

## Toss Payments (결제)

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `TOSS_PAYMENTS_CLIENT_KEY` | Toss 클라이언트 키 (빌링 인증 위젯) | 클라이언트 (공개 가능) |
| `TOSS_PAYMENTS_SECRET_KEY` | Toss API 서버 시크릿 키 | 서버만 (**절대 클라이언트 노출 금지**) |
| `TOSS_PAYMENTS_WEBHOOK_SECRET` | Toss 웹훅 서명 검증 시크릿 | 서버만 (**절대 클라이언트 노출 금지**) |

```bash
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...   # 프로덕션은 live_ck_...
TOSS_PAYMENTS_SECRET_KEY=test_sk_...   # 프로덕션은 live_sk_...
TOSS_PAYMENTS_WEBHOOK_SECRET=whsec_...
```

> 플랜 가격은 Price ID 없이 `lib/toss.ts`의 `PLAN_PRICES`에서 관리 (스타터 3만/스탠다드 7만/프로 15만).  
> 웹훅 엔드포인트: `POST /api/billing/webhook` — Toss 개발자센터에 등록.  
> 정기결제(빌링키)는 Toss와 별도 계약 필요.

---

## 슈퍼어드민 알림 / Cron

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `SUPER_ADMIN_EMAIL` | 결제 실패 등 운영 알림 수신 이메일 | 서버만 |
| `CRON_SECRET` | Vercel Cron 인증 — 크론 라우트가 `Authorization: Bearer $CRON_SECRET` 검증 | 서버만 (**절대 클라이언트 노출 금지**) |

```bash
SUPER_ADMIN_EMAIL=admin@roomly.app
CRON_SECRET=<32자 이상 랜덤 시크릿>
```

> 크론 5종: daily-report(UTC 23시), billing-charge(20시), trial-ending(0시), checkin-alert(10분), cleanup(16시) — `vercel.json` 참고.

---

## Upstash Redis (Rate Limiting — T-070)

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `UPSTASH_REDIS_REST_URL` | Upstash REST API URL | 서버만 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST 토큰 | 서버만 (**절대 클라이언트 노출 금지**) |

```bash
UPSTASH_REDIS_REST_URL=https://xxxxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

> 미설정 시 인메모리 폴백으로 동작 — 단일 인스턴스에서만 정확하므로 프로덕션에서는 필수.

---

## Sentry (에러 추적 — T-170)

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | 에러 수집 DSN | 서버/클라이언트 |
| `SENTRY_ORG` / `SENTRY_PROJECT` | 소스맵 업로드 대상 | 빌드 시 |
| `SENTRY_AUTH_TOKEN` | 소스맵 업로드 토큰 (없으면 업로드만 스킵) | 빌드 시 (**절대 클라이언트 노출 금지**) |

---

## Anthropic (AI 기능 — Phase 3)

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `ANTHROPIC_API_KEY` | AI 인사이트·스마트 배정·리포트 요약 | 서버만 (**절대 클라이언트 노출 금지**) |

> 미설정 시 AI 기능만 비활성화되고 나머지는 정상 동작.

---

## Firebase FCM (네이티브 앱 푸시 — 선택사항)

> **현재 미사용.** FCM 발송 인프라(`lib/fcm.ts`)는 코드에 존재하지만, Firebase 프로젝트가 설정되지 않아 비활성 상태.  
> 아래 환경변수가 없으면 FCM 발송만 조용히 스킵되고 **Web Push(VAPID)는 정상 동작**한다.  
> FCM을 활성화하려면 Firebase 프로젝트를 생성하고 아래 3개 변수를 설정할 것 — `docs/Roomly_네이티브앱.md` §2 참고.

| 변수명 | 용도 | 노출 범위 |
|--------|------|-----------|
| `FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | 서버만 |
| `FIREBASE_CLIENT_EMAIL` | 서비스 계정 이메일 | 서버만 (**절대 클라이언트 노출 금지**) |
| `FIREBASE_PRIVATE_KEY` | 서비스 계정 비공개 키 (`\n` 포함 문자열) | 서버만 (**절대 클라이언트 노출 금지**) |

```bash
# Firebase FCM (선택 — 없으면 네이티브 앱 푸시만 비활성, Web Push는 정상 동작)
FIREBASE_PROJECT_ID=roomly-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@roomly-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
```

---

## Vercel 배포 시

Vercel 대시보드 → Settings → Environment Variables에 동일하게 등록  
`NEXT_PUBLIC_` 접두사가 붙은 변수만 클라이언트 번들에 포함됨  
전체 등록 목록과 체크 절차는 `docs/Roomly_배포체크리스트.md` §1 참고
