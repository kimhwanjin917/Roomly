# Roomly 개발 티켓

> 각 티켓은 독립 실행 가능하도록 설계됨.  
> Claude 에이전트에게 티켓 번호만 주면 필요한 모든 컨텍스트가 여기 있다.  
> **참조 문서**: `docs/Roomly_DB스키마.md`, `docs/Roomly_API라우트.md`, `docs/Roomly_화면목록.md`

---

## 우선순위 기준
- **P0** — 없으면 서비스 불가 또는 수익 차단
- **P1** — 핵심 경쟁력. 첫 유료 고객 전환에 직접 영향
- **P2** — 품질/편의. 없어도 팔 수 있지만 있으면 확연히 좋음

---

# Phase 1 — 마감 (Cleanup)

---

## T-001: 오프라인 배너 UI
**Phase**: 1 | **Priority**: P1 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`, `app/worker/guest/GuestDashboard.tsx`

### 목적
직원이 오프라인 상태일 때 캐시된 데이터를 보고 있다는 것을 명확히 알려준다.  
현재는 오프라인 시 아무 표시도 없어서 데이터가 최신인지 알 수 없다.

### 요구사항
- `window.addEventListener('online' | 'offline')` 이벤트로 상태 감지
- 오프라인 시: 화면 상단에 `bg-amber-500` 배너 표시 — "오프라인 상태입니다. 마지막 데이터를 표시 중입니다."
- 온라인 복귀 시: 배너 사라짐 + `refetch()` 즉시 실행
- 배너는 헤더 바로 아래, 컨텐츠 위에 위치
- SSR 환경에서 `window` 접근 오류 없도록 `useEffect` 내부에서만 처리

### 완료 조건
- 크롬 DevTools → Network → Offline 설정 시 배너 노출
- 다시 Online 전환 시 배너 사라지고 데이터 자동 갱신

---

## T-002: 로딩 스켈레톤 UI
**Phase**: 1 | **Priority**: P2 | **Type**: UI  
**파일**: `app/admin/page.tsx`, `app/admin/stats/page.tsx`

### 목적
현황판과 통계 페이지 초기 로딩 시 빈 화면 대신 스켈레톤 표시.

### 요구사항
- Tailwind `animate-pulse` 기반 스켈레톤 컴포넌트
- 현황판: 카드 6개 그리드 스켈레톤 (실제 카드 크기와 동일)
- 통계 페이지: 숫자 3개 + 바 차트 형태 스켈레톤
- `loading.tsx` 파일로 Next.js 자동 로딩 UI 활용
- 별도 컴포넌트 파일 불필요 — `loading.tsx` 안에 인라인

### 완료 조건
- 느린 네트워크(DevTools Slow 3G)에서 스켈레톤 노출 확인

---

## T-003: 전역 에러 페이지
**Phase**: 1 | **Priority**: P2 | **Type**: UI  
**파일**: `app/not-found.tsx`, `app/error.tsx`

### 목적
404, 500 에러 시 브랜딩 일관된 에러 페이지 표시.

### 요구사항
- `app/not-found.tsx`: "페이지를 찾을 수 없습니다" + 홈으로 버튼
- `app/error.tsx`: "문제가 발생했습니다" + 다시 시도 버튼 + 홈으로 버튼
- 스타일: 흰 배경, `text-slate-900`, 중앙 정렬, Roomly 브랜드 느낌
- 두 파일 모두 100줄 미만

### 완료 조건
- `/존재하지않는경로` 접근 시 not-found 페이지 노출
- `error.tsx`에서 `reset` 함수 호출 시 리렌더링

---

## T-004: 관리자 네비게이션 개선
**Phase**: 1 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/AdminDashboard.tsx`, `app/admin/rooms/page.tsx`, `app/admin/staff/page.tsx`, `app/admin/stats/page.tsx`

### 목적
현재 각 관리자 페이지가 독립적으로 헤더를 구현하고 있어 일관성이 없음.  
공통 네비게이션 컴포넌트로 통합.

### 요구사항
- `components/AdminNav.tsx` 신규 생성
- 링크: 현황판(`/admin`), 객실(`/admin/rooms`), 직원(`/admin/staff`), 통계(`/admin/stats`)
- 현재 경로 `usePathname()`으로 감지해 active 링크 강조 (`text-blue-600`, border-bottom)
- 로그아웃 버튼 포함 (공통화)
- 모바일: 하단 탭바 형태, PC: 상단 가로 네비게이션
- 기존 각 페이지의 헤더/로그아웃 코드 제거하고 `<AdminNav />` 삽입

### 완료 조건
- 4개 관리자 페이지 모두 동일한 `AdminNav` 사용
- 모바일에서 하단 탭바 동작 확인

---

## T-005: 타입스크립트 엄격 모드 정리
**Phase**: 1 | **Priority**: P2 | **Type**: Config  
**파일**: `tsconfig.json`, 전체 `.tsx` 파일

### 목적
`any` 타입, 미사용 변수, 암묵적 타입 오류 제거.

### 요구사항
- `tsconfig.json`에서 `"strict": true` 확인 (이미 true면 스킵)
- `npm run build` 실행 → TypeScript 에러 목록 수집
- 에러별 수정: `any` → 구체적 타입, 미사용 import 제거, null 체크 추가
- `@ts-ignore`, `@ts-expect-error` 사용 금지
- 빌드 통과 = 완료 조건

### 완료 조건
- `npm run build` 에러 0개

---

# Phase 2 — MVP 출시

---

## T-010: 푸시 알림 — 인프라 설정
**Phase**: 2 | **Priority**: P0 | **Type**: Config  
**파일**: `next.config.js`, `worker/index.js`, `.env.local` (가이드 문서)

### 목적
푸시 알림의 기반이 되는 VAPID 키, 서비스 워커 이벤트 핸들러를 설정한다.

### 요구사항
- `npx web-push generate-vapid-keys` 실행 가이드 작성 (`docs/Roomly_환경변수.md`에 추가)
- `next.config.js`: `customWorkerDir: 'worker'`, `serverExternalPackages: ['web-push']` 추가
- `worker/index.js` 생성:
  ```js
  self.addEventListener('push', event => {
    if (!event.data) return
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title || 'Roomly', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'roomly',
        data: { url: data.url || '/' },
        vibrate: [200, 100, 200],
      })
    )
  })
  self.addEventListener('notificationclick', event => {
    event.notification.close()
    const url = event.notification.data?.url || '/'
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        const w = list.find(c => c.url.startsWith(self.location.origin))
        if (w) { w.focus(); w.navigate(url); return }
        clients.openWindow(url)
      })
    )
  })
  ```
- `lib/push.ts` 생성 (sendPushToStaff, sendPushToAdmin 함수)
- 환경변수: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- `push_subscriptions` 테이블은 DB 스키마에 이미 정의됨

### 완료 조건
- `npm run build` 성공
- `worker/index.js`가 빌드된 `public/sw.js`에 번들됨 확인

---

## T-011: 푸시 알림 — 구독 API
**Phase**: 2 | **Priority**: P0 | **Type**: API  
**파일**: `app/api/push/subscribe/route.ts`  
**의존**: T-010

### 목적
직원/관리자의 Web Push 구독 정보를 DB에 저장·삭제하는 API.

### 요구사항
- `POST /api/push/subscribe`:
  - `roomly_worker_session` 쿠키에서 JWT 파싱 → staffId 추출
  - body: `{ subscription: { endpoint, keys: { p256dh, auth } } }`
  - `push_subscriptions` UPSERT (staff_id 기준, 기존 레코드 교체)
  - 응답: `200 { ok: true }`
- `DELETE /api/push/subscribe`:
  - staffId로 push_subscriptions 레코드 삭제
  - 응답: `200 { ok: true }`
- 관리자 구독은 별도: Supabase Auth user_id → `is_admin: true` 레코드

### 완료 조건
- 직원 JWT 쿠키 없이 POST → 401
- 유효한 JWT로 POST → DB 레코드 생성 확인
- DELETE → DB 레코드 삭제 확인

---

## T-012: 푸시 알림 — 직원 벨 버튼 UI
**Phase**: 2 | **Priority**: P1 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`  
**의존**: T-010, T-011

### 목적
직원이 직접 알림을 켜고 끌 수 있는 헤더 벨 버튼. 마운트 시 자동 권한 요청 금지.

### 요구사항
- 상태: `'idle' | 'subscribed' | 'denied' | 'unsupported'`
- 마운트 시: `Notification.permission` 및 기존 구독 여부 확인만 (요청 X)
- 헤더 우상단 벨 버튼:
  - idle: outline 벨 (클릭 → requestPermission + subscribe)
  - subscribed: 채워진 파란 벨 (클릭 → unsubscribe)
  - denied: X 벨 회색 비활성 (title: "브라우저 설정에서 알림을 허용해주세요")
  - unsupported: 버튼 숨김
- 구독 성공 시 `POST /api/push/subscribe` 호출
- 구독 취소 시 `DELETE /api/push/subscribe` 호출
- `urlBase64ToUint8Array` 유틸 함수 포함

### 완료 조건
- 벨 클릭 → 브라우저 알림 권한 팝업 출현 (모바일 포함)
- 허용 후 DB `push_subscriptions`에 레코드 생성 확인

---

## T-013: 푸시 알림 — 배정 시 자동 발송
**Phase**: 2 | **Priority**: P0 | **Type**: API  
**파일**: `app/api/admin/assign/route.ts`, `lib/push.ts`  
**의존**: T-010

### 목적
관리자가 객실을 직원에게 배정하면 해당 직원 폰으로 즉시 푸시 알림 발송.

### 요구사항
- `POST /api/admin/assign` 내부에서 배정 성공 후:
  ```ts
  if (staffId) {
    sendPushToStaff(staffId, {
      title: `${room.number}호 배정됨`,
      body: `${room.floor}층 · 청소를 시작해주세요`,
      url: `/worker/${staffId}`,
      tag: `assign-${staffId}`,
    }).catch(() => {}) // 비차단 — 알림 실패해도 배정은 성공
  }
  ```
- `lib/push.ts`: `sendPushToStaff(staffId, payload)` 구현
  - push_subscriptions에서 staffId로 구독 조회
  - `webpush.sendNotification()` 호출
  - 410 Gone → DB에서 해당 구독 삭제
- 환경변수 없을 경우 조용히 스킵 (vapidInitialized 가드)

### 완료 조건
- 관리자 현황판에서 직원 배정 → 직원 폰에 알림 수신 (직원이 T-012로 구독한 경우)

---

## T-014: 푸시 알림 — 긴급 알림 (관리자)
**Phase**: 2 | **Priority**: P1 | **Type**: API + UI  
**파일**: `app/admin/AdminDashboard.tsx`, `app/api/push/subscribe/route.ts`  
**의존**: T-010, T-011

### 목적
체크인 2시간 전인데 아직 미완료인 방이 있으면 관리자 폰에 알림 발송.

### 요구사항
- 관리자도 구독 가능: `/admin` 헤더에 벨 버튼 추가 (T-012와 동일 패턴, is_admin=true)
- 서버 사이드 크론 또는 클라이언트 60초 폴링으로 긴급 방 감지:
  - `room_logs`에 `alert_type = 'urgent_2h'` 레코드가 없는 경우만 발송 (중복 방지)
  - 발송 후 room_logs에 `alert_type = 'urgent_2h'` 기록
- `POST /api/push/admin-alert` 신규 엔드포인트:
  - 관리자 세션 필요
  - 긴급 방 목록 조회 → 관리자 구독으로 푸시 발송

### 완료 조건
- 체크인 2시간 이내 방이 있을 때 관리자가 구독한 경우 알림 수신
- 같은 방에 대해 알림이 2회 이상 발송되지 않음

---

## T-020: 결제 — Stripe 기본 연동
**Phase**: 2 | **Priority**: P0 | **Type**: Config + API  
**파일**: `lib/stripe.ts`, `app/api/billing/`, `.env.local`

### 목적
Stripe를 연동해 구독 결제의 기반을 마련한다.

### 요구사항
- `npm install stripe @stripe/stripe-js` 실행
- 환경변수: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Stripe Dashboard에서 3개 상품 생성:
  - 스타터: 월 30,000원 (price_starter_monthly)
  - 스탠다드: 월 70,000원 (price_standard_monthly)
  - 프로: 월 150,000원 (price_pro_monthly)
- `lib/stripe.ts`: Stripe 클라이언트 싱글톤
- `hotels` 테이블에 `stripe_customer_id TEXT`, `stripe_subscription_id TEXT`, `plan_expires_at TIMESTAMPTZ` 컬럼 추가 (마이그레이션 SQL 제공)
- `docs/Roomly_환경변수.md`에 Stripe 관련 항목 추가

### 완료 조건
- Stripe 라이브러리 import 에러 없음
- `npm run build` 성공

---

## T-021: 결제 — 구독 플랜 UI
**Phase**: 2 | **Priority**: P0 | **Type**: UI + API  
**파일**: `app/admin/billing/page.tsx`, `app/api/billing/create-session/route.ts`  
**의존**: T-020

### 목적
관리자가 플랜을 선택하고 결제할 수 있는 페이지.

### 요구사항
- `/admin/billing` 신규 페이지
- 3플랜 카드 UI (스타터/스탠다드/프로) — 현재 구독 플랜 강조
- 30일 무료 체험 배지 (첫 구독 시)
- "결제하기" 버튼 → `POST /api/billing/create-session` → Stripe Checkout 리다이렉트
- `POST /api/billing/create-session`:
  - 관리자 세션 확인
  - Stripe Customer 없으면 생성 후 hotel에 stripe_customer_id 저장
  - Stripe Checkout Session 생성 (mode: 'subscription', trial_period_days: 30)
  - 성공 URL: `/admin/billing?success=true`
  - 취소 URL: `/admin/billing`
- 성공 후 "구독이 시작되었습니다" 토스트 표시
- AdminNav에 "결제 관리" 링크 추가

### 완료 조건
- 플랜 선택 → Stripe 결제 페이지 이동
- 테스트 카드(4242 4242 4242 4242)로 결제 성공 → success 화면

---

## T-022: 결제 — 웹훅 처리
**Phase**: 2 | **Priority**: P0 | **Type**: API  
**파일**: `app/api/billing/webhook/route.ts`  
**의존**: T-020

### 목적
Stripe 웹훅 이벤트를 처리해 DB에 구독 상태를 반영한다.

### 요구사항
- `POST /api/billing/webhook`:
  - `stripe.webhooks.constructEvent()`로 서명 검증
  - 처리 이벤트:
    - `checkout.session.completed` → hotel.stripe_subscription_id 저장, plan_expires_at = +30일
    - `invoice.payment_succeeded` → plan_expires_at = 다음 청구일
    - `invoice.payment_failed` → (이메일 발송만, 바로 잠금 안함)
    - `customer.subscription.deleted` → plan_expires_at = 오늘 자정
  - 서비스 롤 클라이언트로 hotel 업데이트
- `export const config = { api: { bodyParser: false } }` 필요 (raw body for signature)

### 완료 조건
- Stripe CLI `stripe listen --forward-to localhost:3000/api/billing/webhook`로 로컬 테스트
- checkout.session.completed 이벤트 → hotel 테이블 업데이트 확인

---

## T-023: 결제 — 플랜 만료 시 잠금
**Phase**: 2 | **Priority**: P1 | **Type**: UI + middleware  
**파일**: `middleware.ts`, `app/admin/AdminDashboard.tsx`  
**의존**: T-022

### 목적
구독 만료된 호텔의 현황판을 읽기 전용으로 잠근다. 배정, 상태 변경 불가.

### 요구사항
- `middleware.ts`에서 `/admin` 접근 시 `hotels.plan_expires_at` 확인:
  - 만료 → `/admin/billing?expired=true`로 리다이렉트
  - 단, `/admin/billing`, `/admin/settings` 경로는 항상 접근 허용
- `/admin/billing?expired=true` 진입 시 "구독이 만료되었습니다" 배너 표시
- 스타터 플랜: 객실 50개 초과 시 추가 등록 불가 (rooms/page.tsx에서 count 체크)
- 스탠다드 플랜: 150개 초과 시 동일 처리

### 완료 조건
- 만료 hotel → /admin 접근 → billing 페이지로 리다이렉트
- 30일 무료 체험 기간 내 → 정상 접근

---

## T-030: 이메일 — Resend 연동
**Phase**: 2 | **Priority**: P1 | **Type**: Config  
**파일**: `lib/email.ts`, `emails/WelcomeEmail.tsx`

### 목적
이메일 발송 기반 설정. 가입 환영 이메일부터 시작.

### 요구사항
- `npm install resend react-email @react-email/components`
- 환경변수: `RESEND_API_KEY`, `EMAIL_FROM` (예: `noreply@roomly.app`)
- `lib/email.ts`: `sendEmail({ to, subject, react })` 래퍼 함수
- `emails/WelcomeEmail.tsx`: React Email 컴포넌트
  - 내용: "Roomly에 오신 것을 환영합니다", 온보딩 3단계 체크리스트, 시작하기 버튼
  - 스타일: Tailwind 기반 (react-email Tailwind 지원)
- `app/api/auth/signup/route.ts`에서 호텔 생성 성공 후 sendEmail 호출 (비차단)

### 완료 조건
- 가입 → 환영 이메일 수신 확인 (Resend 대시보드 로그)

---

## T-031: 이메일 — 일일 리포트
**Phase**: 2 | **Priority**: P1 | **Type**: API + Cron  
**파일**: `app/api/cron/daily-report/route.ts`, `emails/DailyReportEmail.tsx`  
**의존**: T-030

### 목적
매일 오전 8시 전날 통계 요약 이메일을 관리자에게 자동 발송.

### 요구사항
- `app/api/cron/daily-report/route.ts`:
  - `GET` 메서드 (Vercel Cron Job 호출)
  - `CRON_SECRET` 헤더로 인증
  - 전체 hotel 목록 조회 → 각 hotel의 전날 완료 통계 집계
  - 직원별 처리 건수, 평균 처리 시간 포함
  - `sendEmail()` 호출
- `vercel.json`에 cron 설정:
  ```json
  {
    "crons": [{ "path": "/api/cron/daily-report", "schedule": "0 23 * * *" }]
  }
  ```
  (UTC 23:00 = KST 08:00)
- `emails/DailyReportEmail.tsx`: 어제 날짜, 완료율, 직원별 요약 테이블

### 완료 조건
- `GET /api/cron/daily-report?secret=...` 호출 → 이메일 수신
- Vercel 대시보드 Cron Jobs에서 스케줄 확인

---

## T-040: 통계 — 주간/월간 뷰
**Phase**: 2 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/stats/page.tsx`

### 목적
현재 일별 조회만 되는 통계를 주간·월간으로 확장. 관리자가 추세를 파악할 수 있게.

### 요구사항
- 기간 탭: `일` / `주` / `월` 전환 (기본: 일)
- 주간 뷰: 최근 7일 날짜별 완료 건수 막대 차트
- 월간 뷰: 최근 30일 날짜별 완료 건수 + 이동 평균선
- `npm install recharts`
- 차트 컴포넌트: `'use client'` 분리 (SSR 대응)
- Recharts `BarChart` + `LineChart` 사용
- 색상: 완료 `#10b981`, 미완료 `#e2e8f0`

### 완료 조건
- 탭 전환 시 차트 데이터 변경 확인
- 모바일에서 차트 가로 스크롤 또는 축소 표시

---

## T-041: 통계 — CSV 내보내기
**Phase**: 2 | **Priority**: P2 | **Type**: UI + API  
**파일**: `app/admin/stats/page.tsx`, `app/api/admin/stats/export/route.ts`

### 목적
관리자가 통계 데이터를 엑셀/구글시트로 가져갈 수 있게.

### 요구사항
- `npm install papaparse` + `@types/papaparse`
- 통계 페이지에 "CSV 내보내기" 버튼
- 클릭 → `GET /api/admin/stats/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
- 응답: CSV 파일 다운로드 (`Content-Disposition: attachment; filename=roomly_stats_...csv`)
- CSV 컬럼: 날짜, 직원명, 완료 객실 수, 평균 처리 시간(분)
- 관리자 세션 필요

### 완료 조건
- 내보내기 버튼 클릭 → CSV 파일 다운로드
- 엑셀에서 한글 깨짐 없음 (UTF-8 BOM 처리)

---

## T-050: 랜딩 페이지 — 기본
**Phase**: 2 | **Priority**: P0 | **Type**: UI  
**파일**: `app/page.tsx`, `app/(marketing)/layout.tsx`

### 목적
현재 `/` 는 `/login`으로 바로 리다이렉트됨.  
마케팅 랜딩 페이지를 `/`에 두고, 로그인은 `/login`으로 분리.

### 요구사항
- `app/page.tsx`: 랜딩 페이지 (redirect 제거)
- 섹션:
  1. Hero: "텔레그램 단톡방을 졸업하세요" + 시작하기 CTA → `/signup`
  2. 문제: 현실 vs Roomly 비교 테이블 (기획서 내용 활용)
  3. 기능: 3가지 핵심 기능 아이콘 + 설명
  4. 요금제: 3플랜 카드
  5. CTA: 무료로 시작하기
- 헤더: 로고 + 로그인 링크
- 반응형 (모바일/PC)
- 스타일: 흰 배경, blue-600 accent
- SSR 정적 페이지 (no 'use client')
- `app/(marketing)/` Route Group으로 분리해 AdminNav 레이아웃과 격리

### 완료 조건
- `/` 접근 시 랜딩 페이지 표시
- `/login`은 여전히 로그인 폼 표시
- Lighthouse Performance 90+ (static 페이지이므로 달성 가능)

---

## T-051: 랜딩 페이지 — SEO
**Phase**: 2 | **Priority**: P2 | **Type**: Config  
**파일**: `app/page.tsx`, `app/layout.tsx`  
**의존**: T-050

### 목적
"호텔 하우스키핑 관리", "호텔 청소 앱" 키워드로 검색 유입 확보.

### 요구사항
- `app/layout.tsx`의 `metadata` 업데이트:
  - title: "Roomly — 호텔 하우스키핑 실시간 관리"
  - description: "텔레그램 단톡방을 대체하는 호텔 청소팀 관리 도구. QR로 직원 접속, 실시간 현황판."
  - openGraph: og:image, og:url, og:type
  - keywords: 호텔 하우스키핑, 청소 관리, 객실 관리
- `public/sitemap.xml` 생성 (정적)
- `public/robots.txt` 생성

### 완료 조건
- 소셜 공유 시 OG 이미지/제목 표시
- Google Search Console에 sitemap 제출 가능한 형태

---

## T-060: 운영자 대시보드 — 기본
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `app/super-admin/page.tsx`, `app/api/super-admin/`

### 목적
사이트 오너(kimhwanjin917)가 Supabase 콘솔 없이 라이선스 발급, 호텔 현황 조회.

### 요구사항
- `/super-admin` 페이지: 별도 로그인 (이메일 + 마스터 비밀번호, 환경변수로 관리)
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD_HASH` 환경변수
- 기능:
  1. 전체 호텔 목록 (이름, 가입일, 플랜, 객실 수)
  2. 라이선스 발급: 버튼 클릭 → 새 키 생성 → 복사
  3. 라이선스 목록 (발급일, 사용 여부, 사용한 호텔)
- `POST /api/super-admin/license`: 신규 라이선스 발급 (SUPER_ADMIN 세션 필요)
- `GET /api/super-admin/hotels`: 전체 호텔 조회

### 완료 조건
- 마스터 로그인 → 대시보드 접근
- 라이선스 발급 → `licenses` 테이블에 레코드 생성 확인
- 일반 관리자 계정으로 `/super-admin` 접근 시 401

---

## T-061: 운영자 대시보드 — 수익 현황
**Phase**: 2 | **Priority**: P2 | **Type**: UI  
**파일**: `app/super-admin/page.tsx`  
**의존**: T-060, T-020

### 목적
사이트 오너가 Stripe 대시보드 없이 수익 현황을 확인.

### 요구사항
- 월간 수익 (MRR): 활성 구독 × 플랜 금액
- 플랜별 호텔 수 (스타터/스탠다드/프로)
- 최근 30일 신규 가입 추이 (Recharts BarChart)
- Stripe API로 직접 조회 (stripe.subscriptions.list)

### 완료 조건
- 구독 호텔이 있을 때 MRR 숫자 표시
- Stripe 테스트 모드에서 정확한 수치 확인

---

## T-070: 보안 — API Rate Limiting
**Phase**: 2 | **Priority**: P1 | **Type**: Middleware + Config  
**파일**: `middleware.ts`, `lib/rateLimit.ts`

### 목적
악의적 호출, 크리덴셜 스터핑 방어. 특히 `/api/auth/*` 엔드포인트 보호.

### 요구사항
- `npm install @upstash/redis @upstash/ratelimit`
- 환경변수: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `lib/rateLimit.ts`:
  - `/api/auth/qr`, `/api/auth/guest`, `/api/auth/signup`: IP당 10회/분
  - `/api/admin/*`: 로그인 계정당 60회/분
- `middleware.ts`에서 Rate Limit 초과 시 `429 Too Many Requests` 반환
- Vercel Edge Runtime에서 동작 (Upstash는 HTTP 기반이므로 Edge 호환)

### 완료 조건
- 같은 IP에서 11번째 호출 → 429 응답 확인

---

## T-071: 보안 — 로그인 시도 제한
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `app/login/page.tsx`, `app/api/auth/login/route.ts`  
**의존**: T-070

### 목적
이메일/비밀번호 브루트포스 공격 방어.

### 요구사항
- 같은 이메일로 5회 실패 → 30분 잠금
- Upstash Redis에 `login_attempt:{email}` 카운터 저장 (TTL 30분)
- 로그인 폼에서 잠금 상태 시: "30분 후 다시 시도해주세요" 메시지
- 성공 시 카운터 리셋

### 완료 조건
- 5회 실패 → 6번째 시도 즉시 잠금 메시지
- 성공 로그인 후 카운터 0 리셋

---

## T-080: 현황판 UX — 체크인 일괄 등록
**Phase**: 2 | **Priority**: P2 | **Type**: UI  
**파일**: `app/admin/AdminDashboard.tsx`

### 목적
관리자가 매일 아침 체크인 시간을 빠르게 입력할 수 있도록.  
현재는 카드별로 하나씩 클릭해서 입력해야 함.

### 요구사항
- 헤더에 "체크인 일괄 등록" 버튼
- 모달: 활성 객실 목록 + 각 행에 시간 입력 (`input[type=time]`)
- 한번에 저장: Supabase `upsert` 배치 처리
- 체크인 없는 방은 빈칸으로 표시 (삭제 처리 = null)
- 모달 내 "전체 같은 시간" 퀵 버튼 (예: 모두 15:00 입력)

### 완료 조건
- 10개 방 체크인 시간을 모달에서 한 번에 저장
- 저장 후 현황판 카드에 체크인 시간 즉시 반영

---

## T-081: 현황판 UX — 배정 개선
**Phase**: 2 | **Priority**: P2 | **Type**: UI  
**파일**: `app/admin/AdminDashboard.tsx`

### 목적
현재 배정 모달이 너무 많은 걸 하고 있음. UX 단순화.

### 요구사항
- 객실 카드에 직원 이름 칩(chip) 표시 (배정 시)
- 칩 클릭 → 직원 변경 드롭다운 (모달 없이 인라인)
- 미배정 카드 클릭 → 직원 선택 드롭다운 바로 표시
- 배정 취소: 칩 옆 X 버튼
- 모바일: 드롭다운 대신 bottom sheet

### 완료 조건
- 배정 흐름: 카드 클릭 → 직원 선택 → 확정까지 3초 이내

---

# Phase 3 — 정식 SaaS

---

## T-100: 다국어 — next-intl 설정
**Phase**: 3 | **Priority**: P0 | **Type**: Config  
**파일**: `next.config.js`, `middleware.ts`, `i18n/`, `messages/ko.json`

### 목적
한국어/영어/베트남어 지원 기반 설정. 직원 화면은 베트남어 우선.

### 요구사항
- `npm install next-intl`
- 로케일: `ko` (기본), `en`, `vi`
- URL 구조: `/ko/admin`, `/en/admin`, `/vi/worker/...` 또는 Accept-Language 자동 감지
- `messages/ko.json`: 현재 하드코딩된 한국어 문자열 추출
- `middleware.ts`에 next-intl 미들웨어 통합
- `useTranslations()` 훅 적용 시작: WorkerDashboard 우선

### 완료 조건
- `/en/worker/...` 접근 시 영어 표시 (영어 번역 미완료면 한국어 폴백)
- `npm run build` 에러 없음

---

## T-101: 다국어 — 영어 번역
**Phase**: 3 | **Priority**: P1 | **Type**: Content  
**파일**: `messages/en.json`  
**의존**: T-100

### 목적
영어권 외국인 하우스키퍼가 직원 화면을 사용할 수 있게.

### 요구사항
- `messages/ko.json`의 모든 키를 영어로 번역
- 직원 화면 우선 (WorkerDashboard의 모든 텍스트)
- 관리자 화면 번역은 P2 (한국 고객 대상이므로 나중에)
- 영어: 자연스러운 호텔 업계 용어 사용
  - dirty → "Checkout" 또는 "Needs Cleaning"
  - cleaning → "In Progress"
  - done → "Clean"
  - inspect → "Inspection Needed"

### 완료 조건
- `/en/worker/...` 접근 시 영어 UI 표시

---

## T-102: 다국어 — 베트남어 번역
**Phase**: 3 | **Priority**: P1 | **Type**: Content  
**파일**: `messages/vi.json`  
**의존**: T-100

### 목적
베트남 출신 하우스키퍼가 많은 한국 호텔 현실 반영.

### 요구사항
- T-101과 동일 범위, 베트남어로 번역
- 직원 화면 전용 (관리자 화면은 한국어 유지)
- 번역: 전문 번역 또는 Claude로 초안 후 검수

### 완료 조건
- `/vi/worker/...` 접근 시 베트남어 UI 표시

---

## T-110: PMS 연동 — 웹훅 수신
**Phase**: 3 | **Priority**: P1 | **Type**: API  
**파일**: `app/api/pms/webhook/route.ts`

### 목적
PMS(예약 시스템)에서 체크아웃 이벤트를 받아 자동으로 방 상태를 dirty로 전환.

### 요구사항
- `POST /api/pms/webhook`:
  - 이벤트 타입: `checkout` → 해당 room_number 방 status = 'dirty'
  - 이벤트 타입: `checkin_updated` → room.checkin_time 업데이트
  - 인증: `X-Roomly-Webhook-Secret` 헤더 (hotel별 발급된 시크릿)
  - hotel 특정: `X-Hotel-Id` 헤더 또는 URL 파라미터
- `hotels` 테이블에 `webhook_secret TEXT` 컬럼 추가
- 관리자 설정 페이지에서 웹훅 URL + 시크릿 확인 가능

### 완료 조건
- curl로 체크아웃 이벤트 전송 → DB room.status = 'dirty' 확인
- 잘못된 시크릿 → 401

---

## T-111: PMS 연동 — Mews 어댑터
**Phase**: 3 | **Priority**: P2 | **Type**: API  
**파일**: `lib/pms/mews.ts`, `app/api/pms/mews/route.ts`  
**의존**: T-110

### 목적
Mews PMS의 웹훅 포맷을 Roomly 내부 포맷으로 변환.

### 요구사항
- Mews Connector API 웹훅 형식 파싱
- Mews `ReservationUpdated` 이벤트 → T-110 내부 포맷으로 변환
- 방 번호 매핑: Mews `ResourceId` ↔ Roomly `room.number`
  - 관리자 설정에서 매핑 테이블 관리
- `lib/pms/mews.ts`: 변환 함수

### 완료 조건
- Mews 테스트 환경 웹훅 → Roomly 방 상태 변경 확인

---

## T-120: 비품 관리 — DB 스키마
**Phase**: 3 | **Priority**: P1 | **Type**: DB  
**파일**: `docs/Roomly_DB스키마.md` (추가), Supabase 마이그레이션 SQL

### 목적
비품 재고 관리의 데이터 기반 구축.

### 요구사항
- `supplies` 테이블: id, hotel_id, name, unit, stock (로드맵 DDL 참고)
- `supply_requests` 테이블: id, hotel_id, room_id, staff_id, supply_id, quantity, requested_at
- RLS 정책: supplies는 hotel 관리자만 INSERT/UPDATE, 직원은 SELECT만
- supply_requests: 직원이 INSERT (본인 hotel만), 관리자가 SELECT (hotel 전체)
- 마이그레이션 SQL 파일: `supabase/migrations/004_supplies.sql`

### 완료 조건
- 마이그레이션 실행 → 테이블 생성 확인
- RLS 정책으로 다른 hotel 직원이 조회 불가 확인

---

## T-121: 비품 관리 — 직원 요청 UI
**Phase**: 3 | **Priority**: P1 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`  
**의존**: T-120

### 목적
직원이 청소 완료 시 사용한 비품을 기록할 수 있게.

### 요구사항
- "완료" 버튼 → 메모 모달 → "비품 기록" 섹션 추가
- 호텔 비품 목록 조회 (GET /api/worker/supplies)
- 수량 선택 후 supply_requests INSERT
- 선택 없이 완료도 가능 (선택 사항)

### 완료 조건
- 수건 3개, 세면도구 1개 기록 → supply_requests 테이블 확인
- 관리자 화면(T-122)에서 조회 가능

---

## T-122: 비품 관리 — 재고 현황판
**Phase**: 3 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/supplies/page.tsx`  
**의존**: T-120, T-121

### 목적
관리자가 비품 재고와 일별 사용량을 한눈에 파악.

### 요구사항
- `/admin/supplies` 신규 페이지 (AdminNav에 추가)
- 비품 목록 테이블: 품목명, 현재 재고, 오늘 사용량, 추가/수정 버튼
- 재고 < 임계치 시 빨간 강조 (임계치 = supplies.min_stock, 컬럼 추가)
- 비품 추가/수정 모달
- 오늘 사용된 비품 내역 (room별 상세)

### 완료 조건
- 비품 추가 → 목록 표시
- 직원 요청 후 재고 수량 감소 확인

---

## T-130: 유지보수 신고 — DB + API
**Phase**: 3 | **Priority**: P1 | **Type**: DB + API  
**파일**: `supabase/migrations/005_maintenance.sql`, `app/api/worker/maintenance/route.ts`

### 목적
직원이 청소 중 발견한 파손/고장을 신고할 수 있게.

### 요구사항
- `maintenance_requests` 테이블 (로드맵 DDL 참고)
- `POST /api/worker/maintenance`:
  - 직원 세션 필요
  - body: `{ roomId, description, photoUrl? }`
  - maintenance_requests INSERT
- 사진 업로드: Supabase Storage `maintenance-photos` 버킷
- RLS: 직원은 INSERT만, 관리자는 SELECT/UPDATE

### 완료 조건
- 마이그레이션 실행 → 테이블 생성
- POST 호출 → DB 레코드 생성 확인

---

## T-131: 유지보수 신고 — 직원 UI
**Phase**: 3 | **Priority**: P1 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`  
**의존**: T-130

### 목적
직원이 방에서 고장을 발견하면 바로 신고.

### 요구사항
- 각 객실 카드에 "수리 신고" 버튼 (작은 아이콘 버튼)
- 클릭 → 모달: 설명 텍스트 + 사진 첨부 (선택)
- 사진: `<input type="file" accept="image/*" capture="environment">` (카메라 바로 열기)
- 제출 → `POST /api/worker/maintenance`
- 제출 성공 → "신고가 접수되었습니다" 토스트

### 완료 조건
- 사진 없이 설명만으로 신고 가능
- 사진 포함 신고 → Supabase Storage 업로드 확인

---

## T-132: 유지보수 신고 — 관리자 처리 UI
**Phase**: 3 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/maintenance/page.tsx`  
**의존**: T-130

### 목적
관리자가 유지보수 신고를 확인하고 처리.

### 요구사항
- `/admin/maintenance` 신규 페이지 (AdminNav에 추가)
- 신고 목록: 방 번호, 설명, 신고 직원, 신고 시간, 사진 썸네일, 상태
- 상태 변경: open → in_progress → resolved (버튼)
- 처리 완료 시 `resolved_at` 기록
- 미처리 신고 수 AdminNav 배지로 표시

### 완료 조건
- 신고 목록 표시
- 상태 변경 → DB 반영 확인

---

## T-140: 공개 API — 키 발급 시스템
**Phase**: 3 | **Priority**: P2 | **Type**: UI + API  
**파일**: `app/admin/settings/page.tsx`, `app/api/admin/api-keys/route.ts`

### 목적
PMS 업체나 개발자가 Roomly 데이터에 직접 접근할 수 있는 API 키 제공.

### 요구사항
- `api_keys` 테이블 (로드맵 DDL 참고)
- `/admin/settings` 신규 페이지
- API 키 발급: 랜덤 32바이트 → SHA256 해시 저장, 평문은 한 번만 표시
- 키 목록: label, 생성일, 마지막 사용일
- 키 삭제 기능
- 미들웨어에서 `Authorization: Bearer <key>` 헤더 검증

### 완료 조건
- 키 발급 → 복사 후 저장 (재조회 불가 안내)
- Bearer 키로 `/api/v1/rooms` 호출 → 데이터 반환

---

## T-141: 공개 API — REST 엔드포인트
**Phase**: 3 | **Priority**: P2 | **Type**: API  
**파일**: `app/api/v1/rooms/route.ts`, `app/api/v1/assignments/route.ts`  
**의존**: T-140

### 목적
외부 시스템이 Roomly 객실 상태를 읽고 쓸 수 있는 REST API.

### 요구사항
- `GET /api/v1/rooms`: 호텔 전체 객실 목록 + 현재 상태
- `PATCH /api/v1/rooms/{id}`: 객실 상태 변경 (status, checkin_time)
- `GET /api/v1/assignments`: 활성 배정 목록
- 인증: T-140의 API 키 (Bearer)
- 응답: camelCase JSON, ISO 날짜
- Rate Limit: 키당 100회/분

### 완료 조건
- API 키로 `GET /api/v1/rooms` → 객실 목록 JSON 반환
- 잘못된 키 → 401

---

## T-150: 체인 호텔 — 법인 계정
**Phase**: 3 | **Priority**: P2 | **Type**: DB + API  
**파일**: `supabase/migrations/006_organizations.sql`, `app/api/org/`

### 목적
여러 호텔을 가진 체인이 하나의 계정으로 전체 관리.

### 요구사항
- `organizations` 테이블 + `hotels.org_id` 컬럼 추가
- 법인 관리자: 별도 인증 (Supabase Auth, role='org_admin')
- 법인 관리자는 소속 호텔 전체 조회 가능
- 개별 호텔 관리자는 본인 호텔만 접근 (기존 RLS 유지)

### 완료 조건
- 법인 계정으로 로그인 → 소속 3개 호텔 현황 모두 조회 가능
- 개별 관리자 → 본인 호텔만 접근 (기존 동작 유지)

---

## T-151: 체인 호텔 — 멀티 프로퍼티 현황판
**Phase**: 3 | **Priority**: P2 | **Type**: UI  
**파일**: `app/org/[orgId]/page.tsx`  
**의존**: T-150

### 목적
체인 관리자가 전체 호텔 현황을 한눈에 비교.

### 요구사항
- `/org/[orgId]` 신규 페이지 (법인 관리자 전용)
- 호텔별 완료율 비교 (오늘 기준)
- 호텔별 미완료 방 수, 진행 중 방 수
- 호텔 클릭 → 해당 호텔 `/admin` 이동
- 실시간 업데이트 (30초 폴링 또는 Realtime)

### 완료 조건
- 법인 계정으로 3개 호텔 현황 동시 표시
- 호텔별 완료율 숫자 표시

---

## 티켓 의존성 요약

```
T-010 (푸시 인프라)
  ├── T-011 (구독 API)
  │     └── T-012 (벨 버튼 UI)
  ├── T-013 (배정 시 발송)
  └── T-014 (긴급 알림)

T-020 (Stripe 기본)
  ├── T-021 (결제 UI)
  ├── T-022 (웹훅)
  └── T-023 (잠금)

T-030 (Resend 기본)
  └── T-031 (일일 리포트)

T-060 (슈퍼어드민)
  └── T-061 (수익 현황)

T-070 (Rate Limiting)
  └── T-071 (로그인 제한)

T-100 (i18n 설정)
  ├── T-101 (영어)
  └── T-102 (베트남어)

T-110 (PMS 웹훅)
  └── T-111 (Mews 어댑터)

T-120 (비품 DB)
  ├── T-121 (직원 UI)
  └── T-122 (관리자 UI)

T-130 (유지보수 DB)
  ├── T-131 (직원 UI)
  └── T-132 (관리자 UI)

T-140 (API 키)
  └── T-141 (REST API)

T-150 (법인 DB)
  └── T-151 (멀티 현황판)
```

## 병렬 실행 가능 그룹

아래 그룹 내 티켓들은 동시에 실행 가능:

| 그룹 | 티켓 |
|---|---|
| Phase 1 동시 실행 | T-001, T-002, T-003, T-004, T-005 |
| Phase 2 인프라 | T-010, T-020, T-030, T-070 (동시) |
| Phase 2 기능 | T-040, T-041, T-050, T-060, T-080, T-081 (동시) |
| Phase 2 후속 | T-011~014 (T-010 후), T-021~023 (T-020 후), T-031 (T-030 후) |
| Phase 3 동시 실행 | T-100, T-110, T-120, T-130, T-140, T-150 (동시) |
