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

## T-006: 에러케이스.md — Phase 2/3 에러 케이스 추가
**Phase**: 1 | **Priority**: P1 | **Type**: Docs  
**파일**: `docs/Roomly_에러케이스.md`

### 목적
현재 에러케이스.md는 Phase 1 기준. Phase 2/3 기능 개발 전에 에러 처리 방식을 미리 명세.

### 추가할 에러 케이스

**결제 관련 (BILLING-)**
| 코드 | 상황 | 처리 방식 |
|---|---|---|
| BILLING-01 | 구독 만료된 호텔이 /admin 접근 | `/admin/billing?expired=true` 리다이렉트 + 배너 표시 |
| BILLING-02 | 플랜 한도 초과 객실 추가 시도 | 403 응답 + "플랜 업그레이드 필요" 안내 |
| BILLING-03 | Toss 결제 실패 | "결제에 실패했습니다. 카드를 확인해주세요" 표시 (즉시 잠금 안함) |
| BILLING-04 | 웹훅 서명 검증 실패 | 400 응답, 조용히 로그만 (보안상 상세 에러 노출 금지) |

**Rate Limiting (RATE-)**
| 코드 | 상황 | 처리 방식 |
|---|---|---|
| RATE-01 | IP당 인증 API 10회/분 초과 | 429 + "잠시 후 다시 시도해주세요" |
| RATE-02 | 로그인 이메일 5회 실패 | "30분 후 다시 시도해주세요" (계정 잠금) |

**푸시 알림 (PUSH-)**
| 코드 | 상황 | 처리 방식 |
|---|---|---|
| PUSH-01 | 직원이 알림 권한 거부 | X 벨 아이콘으로 표시, 서비스 정상 동작 유지 |
| PUSH-02 | 410 Gone 구독 만료 | DB에서 해당 구독 삭제, 조용히 처리 |

**Realtime (RT-)**
| 코드 | 상황 | 처리 방식 |
|---|---|---|
| RT-01 | Supabase Realtime 연결 끊김 | "연결 중..." 배너 표시 + 자동 재연결 (T-084) |

### 완료 조건
- 각 에러 케이스가 `docs/Roomly_에러케이스.md`에 추가됨

---

## T-007: 환경변수.md — Phase 2/3 환경변수 추가
**Phase**: 1 | **Priority**: P1 | **Type**: Docs  
**파일**: `docs/Roomly_환경변수.md`

### 목적
티켓에서 요구하지만 환경변수.md에 누락된 항목들 추가.

### 추가할 항목

**슈퍼어드민 (T-060a 필요)**
```bash
SUPER_ADMIN_EMAIL=admin@roomly.app
SUPER_ADMIN_JWT_SECRET=<32자 이상 랜덤 시크릿>
```

**Upstash Redis (T-070a 필요)**
```bash
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

**Cron (T-031b 필요)**
```bash
CRON_SECRET=<랜덤 시크릿 — Vercel Cron에서 Authorization 헤더로 전달>
```

- `.env.local` 예시 파일에도 주석으로 추가
- Vercel 환경변수 등록 대상 명시

### 완료 조건
- `docs/Roomly_환경변수.md`에 3개 섹션 추가됨

---

## T-008: 화면목록.md + API라우트.md — Phase 2/3 반영
**Phase**: 1 | **Priority**: P2 | **Type**: Docs  
**파일**: `docs/Roomly_화면목록.md`, `docs/Roomly_API라우트.md`

### 목적
두 문서가 Phase 1 기준으로 멈춰있음. Phase 2/3에서 추가되는 화면과 API를 미리 문서화.

### 화면목록.md에 추가할 페이지
```
/
├── /                       랜딩 페이지 (T-050)
├── /signup                 호텔 가입 (기존 구현됨)
├── /admin/billing          결제·구독 관리 (T-021a)
├── /admin/supplies         비품 재고 현황 (T-122)
├── /admin/maintenance      유지보수 신고 목록 (T-132)
├── /admin/settings         API 키 관리 (T-140)
├── /super-admin            운영자 대시보드 (T-060b)
└── /org/[orgId]            체인 호텔 현황판 (T-151)
```

### API라우트.md에 추가할 엔드포인트
- `/api/billing/*` (create-session, webhook)
- `/api/push/admin-alert`
- `/api/cron/daily-report`
- `/api/admin/stats/export`
- `/api/admin/rooms/bulk-status`
- `/api/super-admin/*`
- `/api/v1/*` (공개 API)

### 완료 조건
- 화면목록.md에 신규 페이지 추가 (권한 요약표 포함)
- API라우트.md에 Phase 2/3 엔드포인트 섹션 추가

---

## T-001: 오프라인 배너 UI
**Phase**: 1 | **Priority**: P1 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`, `app/worker/guest/GuestDashboard.tsx`

### 목적
직원이 오프라인 상태일 때 캐시된 데이터를 보고 있다는 것을 명확히 알려준다.

### 요구사항
- `window.addEventListener('online' | 'offline')` 이벤트로 상태 감지
- 오프라인 시: 화면 상단에 `bg-amber-500` 배너 — "오프라인 상태입니다. 마지막 데이터를 표시 중입니다."
- 온라인 복귀 시: 배너 사라짐 + `refetch()` 즉시 실행
- **오프라인 시 상태 변경 버튼 전체 비활성화** (`disabled` 처리) — 오작동 방지 (`사용자플로우.md` 플로우 11)
- SSR 환경에서 `window` 접근 오류 없도록 `useEffect` 내부에서만 처리

### 완료 조건
- 크롬 DevTools → Network → Offline 설정 시 배너 노출
- 오프라인 상태에서 [청소 시작] / [완료] 등 상태 버튼 클릭 불가 확인
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

## T-004a: AdminNav 컴포넌트 생성
**Phase**: 1 | **Priority**: P1 | **Type**: UI  
**파일**: `components/AdminNav.tsx`

### 목적
공통 관리자 네비게이션 컴포넌트 신규 생성. 아직 어디에도 삽입하지 않음.

### 요구사항
- `components/AdminNav.tsx` 신규 생성
- 링크: 현황판(`/admin`), 객실(`/admin/rooms`), 직원(`/admin/staff`), 통계(`/admin/stats`)
- 현재 경로 `usePathname()`으로 감지해 active 링크 강조 (`text-blue-600`, border-bottom)
- 로그아웃 버튼 포함
- 모바일: 하단 탭바 형태, PC: 상단 가로 네비게이션

### 완료 조건
- `<AdminNav />` import 시 렌더링 오류 없음
- active 링크 스타일 스토리북 또는 직접 확인 (경로 prop 전달 테스트)

---

## T-004b: AdminNav 기존 페이지 통합
**Phase**: 1 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/AdminDashboard.tsx`, `app/admin/rooms/page.tsx`, `app/admin/staff/page.tsx`, `app/admin/stats/page.tsx`  
**의존**: T-004a

### 목적
T-004a에서 만든 `AdminNav`를 4개 관리자 페이지에 삽입하고 중복 헤더/로그아웃 코드 제거.

### 요구사항
- 각 페이지에서 기존 헤더/로그아웃 버튼 코드 제거
- `<AdminNav />` 삽입 (페이지 최상단)
- 레이아웃 깨짐 없는지 확인

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

### 완료 조건
- `npm run build` 에러 0개

---

# Phase 2 — MVP 출시

---

## T-010a: 푸시 알림 — VAPID 키 + 서비스 워커
**Phase**: 2 | **Priority**: P0 | **Type**: Config  
**파일**: `next.config.js`, `worker/index.js`, `docs/Roomly_환경변수.md`

### 목적
푸시 알림의 기반이 되는 VAPID 키 설정과 서비스 워커 이벤트 핸들러 작성.

### 요구사항
- `npx web-push generate-vapid-keys` 실행 가이드 → `docs/Roomly_환경변수.md`에 추가
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
- 환경변수 문서에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` 추가

### 완료 조건
- `npm run build` 성공
- `worker/index.js`가 빌드된 `public/sw.js`에 번들됨 확인

---

## T-010b: 푸시 알림 — lib/push.ts 라이브러리
**Phase**: 2 | **Priority**: P0 | **Type**: API  
**파일**: `lib/push.ts`  
**의존**: T-010a

### 목적
서버 사이드에서 푸시를 발송하는 함수 라이브러리 작성. 이후 T-013, T-014b에서 재사용.

### 요구사항
- `lib/push.ts` 생성
- `vapidInitialized` 가드: 환경변수 없으면 조용히 스킵
- `sendPushToStaff(staffId: string, payload: PushPayload): Promise<void>`
  - `push_subscriptions`에서 staffId로 구독 조회
  - `webpush.sendNotification()` 호출
  - 410 Gone → DB에서 해당 구독 삭제
- `sendPushToAdmin(hotelId: string, payload: PushPayload): Promise<void>`
  - is_admin=true인 구독 조회 → 발송
- `PushPayload` 타입: `{ title: string; body: string; url?: string; tag?: string }`

### 완료 조건
- TypeScript 컴파일 에러 없음
- `sendPushToStaff`에 존재하지 않는 staffId 넣으면 조용히 종료 (에러 throw X)

---

## T-011: 푸시 알림 — 구독 API
**Phase**: 2 | **Priority**: P0 | **Type**: API  
**파일**: `app/api/push/subscribe/route.ts`  
**의존**: T-010a

### 목적
직원/관리자의 Web Push 구독 정보를 DB에 저장·삭제하는 API.

### 요구사항
- `POST /api/push/subscribe`:
  - `roomly_worker_session` 쿠키에서 JWT 파싱 → staffId 추출
  - body: `{ subscription: { endpoint, keys: { p256dh, auth } }, isAdmin?: boolean }`
  - `push_subscriptions` UPSERT (staff_id 기준, 기존 레코드 교체)
  - 응답: `200 { ok: true }`
- `DELETE /api/push/subscribe`:
  - staffId로 push_subscriptions 레코드 삭제
  - 응답: `200 { ok: true }`

### 완료 조건
- 직원 JWT 쿠키 없이 POST → 401
- 유효한 JWT로 POST → DB 레코드 생성 확인
- DELETE → DB 레코드 삭제 확인

---

## T-012: 푸시 알림 — 직원 벨 버튼 UI
**Phase**: 2 | **Priority**: P1 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`  
**의존**: T-010a, T-011

### 목적
직원이 직접 알림을 켜고 끌 수 있는 헤더 벨 버튼.

### 요구사항
- 상태: `'idle' | 'subscribed' | 'denied' | 'unsupported'`
- 마운트 시: `Notification.permission` 및 기존 구독 여부 확인만 (자동 요청 X)
- 헤더 우상단 벨 버튼:
  - idle: outline 벨 (클릭 → requestPermission + subscribe)
  - subscribed: 채워진 파란 벨 (클릭 → unsubscribe)
  - denied: X 벨 회색 비활성 (title: "브라우저 설정에서 알림을 허용해주세요")
  - unsupported: 버튼 숨김
- `urlBase64ToUint8Array` 유틸 함수 포함

### 완료 조건
- 벨 클릭 → 브라우저 알림 권한 팝업 출현 (모바일 포함)
- 허용 후 DB `push_subscriptions`에 레코드 생성 확인

---

## T-013: 푸시 알림 — 배정 시 자동 발송
**Phase**: 2 | **Priority**: P0 | **Type**: API  
**파일**: `app/api/admin/assign/route.ts`  
**의존**: T-010b

### 목적
관리자가 객실을 직원에게 배정하면 해당 직원 폰으로 즉시 푸시 발송.

### 요구사항
- `POST /api/admin/assign` 내부 배정 성공 후 비차단 호출:
  ```ts
  if (staffId) {
    sendPushToStaff(staffId, {
      title: `${room.number}호 배정됨`,
      body: `${room.floor}층 · 청소를 시작해주세요`,
      url: `/worker/${staffId}`,
      tag: `assign-${staffId}`,
    }).catch(() => {})
  }
  ```
- 알림 실패해도 배정 응답은 200 성공 유지

### 완료 조건
- 관리자 현황판에서 직원 배정 → 직원 폰에 알림 수신 (직원이 T-012로 구독한 경우)

---

## T-014a: 푸시 알림 — 관리자 벨 버튼 UI
**Phase**: 2 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/AdminDashboard.tsx`  
**의존**: T-010a, T-011

### 목적
관리자도 푸시 구독할 수 있도록 `/admin` 헤더에 벨 버튼 추가.

### 요구사항
- T-012와 동일한 벨 버튼 패턴 (상태 4가지 동일)
- 구독 시 `POST /api/push/subscribe` body에 `isAdmin: true` 포함
- 관리자는 Supabase Auth 세션 기반 인증 (직원 JWT와 다름)
- AdminNav에 벨 버튼 포함 (T-004a와 동시 진행 가능)

### 완료 조건
- `/admin` 헤더에서 벨 클릭 → 권한 요청 팝업
- DB `push_subscriptions`에 `is_admin = true` 레코드 생성

---

## T-014b: 푸시 알림 — 긴급 알림 감지 + API
**Phase**: 2 | **Priority**: P1 | **Type**: API  
**파일**: `app/api/push/admin-alert/route.ts`  
**의존**: T-010b, T-014a

### 목적
체크인 2시간 전인데 미완료인 방 감지 → 관리자 폰에 알림 발송.

### 요구사항
- `POST /api/push/admin-alert` 신규 엔드포인트:
  - 관리자 세션 필요
  - 긴급 방 조회: `checkin_time <= now() + 2h AND status != 'done'`
  - `room_logs`에 `alert_type = 'urgent_2h'` 레코드 없는 경우만 발송 (중복 방지)
  - 발송 후 room_logs에 `alert_type = 'urgent_2h'` 기록
  - `sendPushToAdmin()` 호출
- **구현 방식: 클라이언트 60초 폴링** (서버 크론 아님) — `사용자플로우.md` 플로우 7에서 "클라이언트 60초 인터벌 폴링"으로 명시됨
  - AdminDashboard 마운트 시 `setInterval(60000)` 시작, 언마운트 시 `clearInterval`
  - 폴링 주기마다 `POST /api/push/admin-alert` 호출

### 완료 조건
- 체크인 2시간 이내 방 있을 때 관리자 알림 수신
- 같은 방에 대해 알림 2회 이상 발송 안됨

---

## T-020a: 결제 — Stripe 설치 + 환경변수
**Phase**: 2 | **Priority**: P0 | **Type**: Config  
**파일**: `lib/stripe.ts`, `docs/Roomly_환경변수.md`

### 목적
Stripe 패키지 설치, 싱글톤 클라이언트 생성, 환경변수 문서화.

### 요구사항
- `npm install stripe @stripe/stripe-js` 실행
- 환경변수 추가: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `lib/stripe.ts`: Stripe 클라이언트 싱글톤
  ```ts
  import Stripe from 'stripe'
  export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  })
  ```
- `docs/Roomly_환경변수.md`에 Stripe 항목 추가
- Stripe Dashboard에서 3개 상품 생성 가이드 문서화:
  - 스타터: 월 30,000원 (price_starter_monthly)
  - 스탠다드: 월 70,000원 (price_standard_monthly)
  - 프로: 월 150,000원 (price_pro_monthly)

### 완료 조건
- `import { stripe } from '@/lib/stripe'` 에러 없음
- `npm run build` 성공

---

## T-020b: 결제 — DB 마이그레이션 (Stripe 컬럼)
**Phase**: 2 | **Priority**: P0 | **Type**: DB  
**파일**: `supabase/migrations/003_stripe.sql`  
**의존**: T-020a

### 목적
`hotels` 테이블에 Stripe 구독 관련 컬럼 추가.

### 요구사항
- `supabase/migrations/003_stripe.sql` 생성:
  ```sql
  ALTER TABLE hotels
    ADD COLUMN stripe_customer_id TEXT,
    ADD COLUMN stripe_subscription_id TEXT,
    ADD COLUMN plan TEXT NOT NULL DEFAULT 'trial',
    ADD COLUMN plan_expires_at TIMESTAMPTZ;
  ```
- `plan` 값: `'trial' | 'starter' | 'standard' | 'pro' | 'expired'`
- 기존 모든 hotel의 `plan_expires_at` = now() + 30일 (첫 무료 체험 부여)
- `docs/Roomly_DB스키마.md`에 반영

### 완료 조건
- 마이그레이션 실행 → hotels 테이블에 컬럼 추가 확인
- 기존 데이터 유지됨

---

## T-021a: 결제 — 구독 플랜 UI 페이지
**Phase**: 2 | **Priority**: P0 | **Type**: UI  
**파일**: `app/admin/billing/page.tsx`  
**의존**: T-020b

### 목적
관리자가 플랜을 선택하는 페이지 UI. 실제 결제 버튼은 T-021b의 API 완성 후 연결.

### 요구사항
- `/admin/billing` 신규 페이지
- 3플랜 카드 UI (스타터/스탠다드/프로)
  - 각 카드: 플랜명, 가격, 객실 한도, 기능 목록
  - 현재 구독 플랜 강조 (border-blue-600)
- 30일 무료 체험 배지 (첫 구독 시 조건부 표시)
- "결제하기" 버튼 → onClick에서 `POST /api/billing/create-session` 호출 (T-021b 연결)
- `/admin/billing?success=true` 진입 시 "구독이 시작되었습니다" 토스트
- `/admin/billing?expired=true` 진입 시 "구독이 만료되었습니다" 배너
- AdminNav에 "결제 관리" 링크 추가

### 완료 조건
- `/admin/billing` 접근 시 3플랜 카드 렌더링 확인
- 현재 플랜 하이라이트 표시

---

## T-021b: 결제 — create-session API
**Phase**: 2 | **Priority**: P0 | **Type**: API  
**파일**: `app/api/billing/create-session/route.ts`  
**의존**: T-020a, T-020b

### 목적
Stripe Checkout 세션 생성 API.

### 요구사항
- `POST /api/billing/create-session`:
  - body: `{ priceId: string }` (price_starter_monthly 등)
  - 관리자 세션 확인
  - Stripe Customer 없으면 생성 후 `hotels.stripe_customer_id` 저장
  - Stripe Checkout Session 생성:
    - mode: `'subscription'`
    - trial_period_days: 30 (첫 구독만, stripe_customer_id 없던 경우)
    - success_url: `/admin/billing?success=true`
    - cancel_url: `/admin/billing`
  - 응답: `{ url: checkoutSession.url }`
- 클라이언트에서 응답 url로 `window.location.href` 리다이렉트

### 완료 조건
- 플랜 선택 → Stripe 결제 페이지 이동
- 테스트 카드(4242 4242 4242 4242)로 결제 성공 → success 화면

---

## T-022: 결제 — 웹훅 처리
**Phase**: 2 | **Priority**: P0 | **Type**: API  
**파일**: `app/api/billing/webhook/route.ts`  
**의존**: T-020a

### 목적
Stripe 웹훅 이벤트로 DB 구독 상태 반영.

### 요구사항
- `POST /api/billing/webhook`:
  - `stripe.webhooks.constructEvent()`로 서명 검증
  - 처리 이벤트:
    - `checkout.session.completed` → hotel.stripe_subscription_id 저장, plan_expires_at = +30일
    - `invoice.payment_succeeded` → plan_expires_at = 다음 청구일
    - `invoice.payment_failed` → 로그만 (즉시 잠금 X)
    - `customer.subscription.deleted` → plan_expires_at = 오늘 자정, plan = 'expired'
  - 서비스 롤 클라이언트로 hotel 업데이트
- Next.js App Router에서 raw body: `request.arrayBuffer()` 사용

### 완료 조건
- `stripe listen --forward-to localhost:3000/api/billing/webhook`로 로컬 테스트
- checkout.session.completed → hotel 테이블 업데이트 확인

---

## T-023a: 결제 — 만료 미들웨어 리다이렉트
**Phase**: 2 | **Priority**: P1 | **Type**: Middleware  
**파일**: `middleware.ts`  
**의존**: T-022

### 목적
구독 만료된 호텔이 `/admin` 접근 시 청구 페이지로 리다이렉트.

### 요구사항
- `middleware.ts`에서 `/admin` 경로 요청 시:
  - 관리자 세션에서 hotel_id 추출 → `hotels.plan_expires_at` 조회
  - 만료(`plan_expires_at < now()`) → `/admin/billing?expired=true` 리다이렉트
  - 예외 경로 (항상 허용): `/admin/billing`, `/admin/settings`
- 만료 확인은 Edge Runtime 호환 방식으로 (Supabase fetch 직접)

### 완료 조건
- 만료 hotel → `/admin` 접근 → billing 페이지 리다이렉트
- `/admin/billing` 자체는 만료 상태에서도 접근 가능

---

## T-023b: 결제 — 플랜별 객실 수 제한
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `app/admin/rooms/page.tsx`, `app/api/admin/rooms/route.ts`  
**의존**: T-020b

### 목적
스타터/스탠다드 플랜 객실 한도 초과 시 추가 등록 불가.

### 요구사항
- 한도: 스타터 50개, 스탠다드 150개, 프로 무제한
- `POST /api/admin/rooms`:
  - 현재 hotel rooms count 조회
  - plan 대비 한도 초과 시 `403 { error: '플랜 한도 초과. 업그레이드 필요.' }`
- `/admin/rooms` 페이지: 한도 도달 시 "객실 추가" 버튼 비활성 + 안내 텍스트

### 완료 조건
- 스타터 플랜에서 50개 방 있는 상태로 추가 시도 → 403 + UI 안내

---

## T-030a: 이메일 — Resend 설치 + 환경변수
**Phase**: 2 | **Priority**: P1 | **Type**: Config  
**파일**: `lib/email.ts`, `docs/Roomly_환경변수.md`

### 목적
이메일 발송 기반 설정.

### 요구사항
- `npm install resend react-email @react-email/components`
- 환경변수: `RESEND_API_KEY`, `EMAIL_FROM` (예: `noreply@roomly.app`)
- `lib/email.ts`:
  ```ts
  import { Resend } from 'resend'
  const resend = new Resend(process.env.RESEND_API_KEY)
  export async function sendEmail({ to, subject, react }: EmailOptions) {
    if (!process.env.RESEND_API_KEY) return
    await resend.emails.send({ from: process.env.EMAIL_FROM!, to, subject, react })
  }
  ```
- `docs/Roomly_환경변수.md`에 항목 추가

### 완료 조건
- `import { sendEmail } from '@/lib/email'` 에러 없음
- `npm run build` 성공

---

## T-030b: 이메일 — 가입 환영 이메일
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `emails/WelcomeEmail.tsx`, `app/api/auth/signup/route.ts`  
**의존**: T-030a

### 목적
회원가입 성공 시 환영 이메일 자동 발송.

### 요구사항
- `emails/WelcomeEmail.tsx` React Email 컴포넌트:
  - 내용: "Roomly에 오신 것을 환영합니다", 온보딩 3단계 체크리스트, 시작하기 버튼
  - 스타일: 흰 배경, blue-600 accent
- `app/api/auth/signup/route.ts`에서 호텔 생성 성공 후:
  ```ts
  sendEmail({ to: adminEmail, subject: 'Roomly에 오신 걸 환영합니다', react: <WelcomeEmail /> }).catch(() => {})
  ```
  (비차단 — 이메일 실패해도 가입은 성공)

### 완료 조건
- 가입 → Resend 대시보드 로그에서 발송 확인

---

## T-031a: 이메일 — 일일 리포트 템플릿
**Phase**: 2 | **Priority**: P1 | **Type**: UI  
**파일**: `emails/DailyReportEmail.tsx`  
**의존**: T-030a

### 목적
일일 리포트 이메일 React Email 컴포넌트 작성.

### 요구사항
- `emails/DailyReportEmail.tsx`:
  - props: `{ date: string; totalRooms: number; completedRooms: number; staffStats: { name: string; count: number; avgMinutes: number }[] }`
  - 어제 날짜, 완료율 (%), 직원별 요약 테이블
  - 스타일: 심플 테이블 레이아웃

### 완료 조건
- `react-email` dev 서버(`npx email dev`)에서 렌더링 확인

---

## T-031b: 이메일 — 일일 리포트 cron API
**Phase**: 2 | **Priority**: P1 | **Type**: API + Config  
**파일**: `app/api/cron/daily-report/route.ts`, `vercel.json`  
**의존**: T-030a, T-031a

### 목적
매일 오전 8시 전날 통계를 집계해 이메일 발송하는 cron 엔드포인트.

### 요구사항
- `app/api/cron/daily-report/route.ts`:
  - `GET` 메서드
  - `Authorization: Bearer ${CRON_SECRET}` 헤더 검증
  - 전날 날짜 범위로 hotel별 완료 통계 집계
  - 직원별 처리 건수, 평균 처리 시간 계산
  - `sendEmail({ react: <DailyReportEmail /> })` 호출
- `vercel.json` 생성:
  ```json
  {
    "crons": [{ "path": "/api/cron/daily-report", "schedule": "0 23 * * *" }]
  }
  ```
  (UTC 23:00 = KST 08:00)
- 환경변수 `CRON_SECRET` 추가

### 완료 조건
- `GET /api/cron/daily-report` with Bearer → 이메일 수신
- Vercel 대시보드 Cron Jobs에서 스케줄 확인

---

## T-032: 이메일 — 결제 영수증 이메일
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `emails/ReceiptEmail.tsx`, `app/api/billing/webhook/route.ts`  
**의존**: T-030a, T-022

### 목적
결제 성공 시 영수증 이메일 자동 발송.

### 요구사항
- `emails/ReceiptEmail.tsx`:
  - props: `{ hotelName: string; plan: string; amount: number; nextBillingDate: string }`
  - 결제 금액, 플랜명, 다음 결제일 표시
- `app/api/billing/webhook/route.ts`의 `invoice.payment_succeeded` 핸들러에서:
  ```ts
  sendEmail({ to: adminEmail, subject: 'Roomly 결제 영수증', react: <ReceiptEmail ... /> }).catch(() => {})
  ```
- 관리자 이메일은 `hotels` 테이블의 email 컬럼 또는 Supabase Auth user email

### 완료 조건
- Stripe 테스트 결제 성공 → 영수증 이메일 수신

---

## T-040a: 통계 — 기간 탭 + 주간 차트
**Phase**: 2 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/stats/page.tsx`, `components/StatsChart.tsx`

### 목적
일/주/월 탭 추가 및 주간 바 차트 구현.

### 요구사항
- `npm install recharts`
- `일` / `주` / `월` 탭 (기본: 일)
- `components/StatsChart.tsx` 클라이언트 컴포넌트 (`'use client'`):
  - Recharts `BarChart` 사용
  - props: `{ data: { date: string; completed: number }[] }`
  - 색상: 완료 `#10b981`, 미완료 `#e2e8f0`
- 주간 뷰: 최근 7일 날짜별 완료 건수 바 차트
- 데이터 조회: 기존 stats API에 `period` 파라미터 추가 (`'day' | 'week' | 'month'`)

### 완료 조건
- 주 탭 클릭 → 최근 7일 바 차트 표시
- 모바일에서 가로 스크롤 또는 축소 표시

---

## T-040b: 통계 — 월간 차트 + 이동 평균
**Phase**: 2 | **Priority**: P1 | **Type**: UI  
**파일**: `components/StatsChart.tsx`  
**의존**: T-040a

### 목적
월간 뷰에 이동 평균선 추가.

### 요구사항
- 월간 뷰: 최근 30일 완료 건수 바 차트 + 7일 이동 평균 라인
- Recharts `ComposedChart` (`Bar` + `Line`) 사용
- 이동 평균 계산: 클라이언트 사이드 (서버에서 raw 데이터만 전달)
- 라인 색상: `#6366f1`

### 완료 조건
- 월 탭 클릭 → 30일 바 + 이동 평균 라인 표시

---

## T-041: 통계 — CSV 내보내기
**Phase**: 2 | **Priority**: P2 | **Type**: UI + API  
**파일**: `app/admin/stats/page.tsx`, `app/api/admin/stats/export/route.ts`

### 목적
관리자가 통계 데이터를 엑셀/구글시트로 가져갈 수 있게.

### 요구사항
- `npm install papaparse @types/papaparse`
- 통계 페이지에 "CSV 내보내기" 버튼
- `GET /api/admin/stats/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
- 응답: `Content-Disposition: attachment; filename=roomly_stats_...csv`
- CSV 컬럼: 날짜, 직원명, 완료 객실 수, 평균 처리 시간(분)
- UTF-8 BOM 처리 (`﻿` 앞에 붙이기)

### 완료 조건
- 내보내기 버튼 → CSV 다운로드
- 엑셀에서 한글 깨짐 없음

---

## T-042: 통계 — 직원별 성과 차트
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `app/admin/stats/page.tsx`, `app/api/admin/stats/staff/route.ts`  
**의존**: T-040a

### 목적
직원별 처리 건수 및 평균 처리 시간 추이를 시각화.

### 요구사항
- `GET /api/admin/stats/staff?from=YYYY-MM-DD&to=YYYY-MM-DD`:
  - 직원별: 완료 건수, 평균 처리 시간(분), 날짜별 건수 배열
- 통계 페이지 하단에 "직원별 성과" 섹션:
  - 직원별 카드: 이름, 총 완료 건수, 평균 처리 시간
  - 최근 7일 미니 바 차트 (Recharts `BarChart` 소형)
- 기간 탭과 동기화 (T-040a의 period 파라미터 공유)

### 완료 조건
- 직원 2명 이상일 때 각자 카드와 미니 차트 표시

---

## T-050a: 랜딩 — Route Group + 라우팅 분리
**Phase**: 2 | **Priority**: P0 | **Type**: Config  
**파일**: `app/(marketing)/layout.tsx`, `app/page.tsx`, `middleware.ts`

### 목적
현재 `/`에서 `/login`으로 redirect되는 구조를 분리. marketing layout 격리.

### 요구사항
- `app/(marketing)/layout.tsx` 생성 (AdminNav 없는 독립 레이아웃)
- `app/page.tsx`에서 `/login` redirect 제거 → 빈 랜딩 컴포넌트로 교체 (T-050b에서 채울 것)
- `middleware.ts`에서 `/` 경로는 인증 체크 제외
- `app/login/page.tsx`는 그대로 유지

### 완료 조건
- `/` 접근 시 login redirect 없음
- `/login`은 여전히 로그인 폼 표시

---

## T-050b: 랜딩 — Hero + 문제 + 기능 섹션
**Phase**: 2 | **Priority**: P0 | **Type**: UI  
**파일**: `app/page.tsx`  
**의존**: T-050a

### 목적
랜딩 페이지 상단 3개 섹션 작성.

### 요구사항
- **헤더**: 로고(`Roomly`) + 로그인 링크 (`/login`)
- **섹션 1 — Hero**: 
  - 헤드라인: "텔레그램 단톡방을 졸업하세요"
  - 서브: "실시간 객실 현황 · QR 직원 접속 · 자동 알림"
  - CTA 버튼: "무료로 시작하기" → `/signup`
- **섹션 2 — 문제**:
  - 기존 방식 vs Roomly 비교 테이블 (기획서 내용 활용)
- **섹션 3 — 기능**:
  - 3가지 핵심 기능 아이콘 + 설명 카드
- SSR 정적 (no `'use client'`)

### 완료 조건
- `/` 접근 시 Hero, 문제 비교, 기능 섹션 렌더링 확인
- 모바일에서 레이아웃 깨짐 없음

---

## T-050c: 랜딩 — 요금제 + CTA + 반응형
**Phase**: 2 | **Priority**: P0 | **Type**: UI  
**파일**: `app/page.tsx`  
**의존**: T-050b

### 목적
랜딩 페이지 요금제 카드 + 하단 CTA + 전체 반응형 완성.

### 요구사항
- **섹션 4 — 요금제**: 3플랜 카드 (스타터/스탠다드/프로, 가격, 주요 기능)
- **섹션 5 — CTA**: "30일 무료로 시작하기" 버튼 → `/signup`
- **푸터**: 저작권 표시
- Lighthouse Performance 90+ 목표 (static page)
- 모바일/PC 반응형 완성

### 완료 조건
- 전체 랜딩 페이지 모바일/PC 양쪽에서 레이아웃 정상
- `/signup` 링크 정상 동작

---

## T-051: 랜딩 — SEO
**Phase**: 2 | **Priority**: P2 | **Type**: Config  
**파일**: `app/page.tsx`, `app/layout.tsx`, `public/`  
**의존**: T-050a

### 목적
"호텔 하우스키핑 관리" 키워드 검색 유입 확보.

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
- sitemap.xml 유효한 형태

---

## T-060a: 슈퍼어드민 — 로그인 인증
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `app/super-admin/login/page.tsx`, `app/api/super-admin/auth/route.ts`

### 목적
사이트 오너 전용 별도 로그인 시스템 구축.

### 요구사항
- `app/super-admin/login/page.tsx`: 이메일 + 비밀번호 폼
- `POST /api/super-admin/auth`:
  - body: `{ email, password }`
  - `SUPER_ADMIN_EMAIL` 환경변수와 이메일 비교
  - `SUPER_ADMIN_PASSWORD_HASH`와 bcrypt compare
  - 성공 시 `super_admin_session` 쿠키 발급 (JWT, 24시간)
- middleware에서 `/super-admin` 경로: 쿠키 없으면 `/super-admin/login` 리다이렉트
- 환경변수: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD_HASH`, `SUPER_ADMIN_JWT_SECRET`

### 완료 조건
- 올바른 자격증명 → `/super-admin` 접근 성공
- 잘못된 비밀번호 → 로그인 폼 에러 표시
- 쿠키 없이 `/super-admin` → 로그인 페이지 리다이렉트

---

## T-060b: 슈퍼어드민 — 호텔 목록 조회
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `app/super-admin/page.tsx`, `app/api/super-admin/hotels/route.ts`  
**의존**: T-060a

### 목적
전체 호텔 현황을 한눈에 파악하는 관리 화면.

### 요구사항
- `GET /api/super-admin/hotels`:
  - super_admin_session 쿠키 검증
  - 전체 hotel 목록: id, name, plan, plan_expires_at, rooms_count, created_at
  - 서비스 롤 클라이언트로 조회
- `/super-admin/page.tsx`:
  - 호텔 목록 테이블: 이름, 가입일, 플랜, 객실 수, 만료일
  - 검색 필터 (이름)
  - 로그아웃 버튼

### 완료 조건
- 마스터 로그인 → 호텔 목록 테이블 표시
- 일반 관리자 쿠키로 `/super-admin` → 401

---

## T-060c: 슈퍼어드민 — 라이선스 발급 시스템
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `app/super-admin/page.tsx`, `app/api/super-admin/license/route.ts`  
**의존**: T-060b

### 목적
Supabase 콘솔 없이 UI에서 라이선스 발급.

### 요구사항
- `POST /api/super-admin/license`:
  - super_admin_session 검증
  - `crypto.randomUUID()` + 추가 랜덤으로 32자 키 생성
  - `licenses` 테이블에 INSERT (key, created_at, used=false)
  - 응답: `{ key: '발급된키' }` (평문, 한 번만 노출)
- `GET /api/super-admin/license`:
  - 전체 라이선스 목록: 발급일, 사용 여부, 사용한 호텔명
- UI: "라이선스 발급" 버튼 → 모달에 키 표시 (복사 버튼 포함, "다시 조회 불가" 안내)

### 완료 조건
- 라이선스 발급 → `licenses` 테이블에 레코드 생성
- 기존 가입 흐름에서 해당 라이선스로 가입 시 `used=true` 처리

---

## T-061: 슈퍼어드민 — 수익 현황
**Phase**: 2 | **Priority**: P2 | **Type**: UI  
**파일**: `app/super-admin/page.tsx`  
**의존**: T-060b, T-020a

### 목적
사이트 오너가 Stripe 대시보드 없이 MRR 확인.

### 요구사항
- Stripe API로 직접 조회 (`stripe.subscriptions.list`)
- 표시:
  - 월간 수익(MRR): 활성 구독 × 플랜 금액
  - 플랜별 호텔 수 (스타터/스탠다드/프로)
  - 최근 30일 신규 가입 추이 (Recharts BarChart)
- 서버 컴포넌트로 구현 (Stripe secret key 노출 방지)

### 완료 조건
- 구독 호텔 있을 때 MRR 숫자 표시
- Stripe 테스트 모드에서 정확한 수치 확인

---

## T-070a: 보안 — Upstash Redis 설정
**Phase**: 2 | **Priority**: P1 | **Type**: Config  
**파일**: `lib/rateLimit.ts`, `docs/Roomly_환경변수.md`

### 목적
Upstash Redis 연결 및 Rate Limit 설정 파일 작성.

### 요구사항
- `npm install @upstash/redis @upstash/ratelimit`
- 환경변수: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `lib/rateLimit.ts`:
  ```ts
  import { Ratelimit } from '@upstash/ratelimit'
  import { Redis } from '@upstash/redis'
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  export const authRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m') })
  export const adminRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m') })
  ```
- `docs/Roomly_환경변수.md`에 항목 추가

### 완료 조건
- import 에러 없음
- `npm run build` 성공

---

## T-070b: 보안 — Rate Limiting 미들웨어
**Phase**: 2 | **Priority**: P1 | **Type**: Middleware  
**파일**: `middleware.ts`  
**의존**: T-070a

### 목적
미들웨어에서 Rate Limit 초과 시 429 반환.

### 요구사항
- `/api/auth/qr`, `/api/auth/guest`, `/api/auth/signup`: IP당 10회/분 (`authRateLimit`)
- `/api/admin/*`: 관리자 계정당 60회/분 (`adminRateLimit`)
- 초과 시: `429 Too Many Requests` + `Retry-After` 헤더
- Vercel Edge Runtime 호환 (Upstash는 HTTP 기반이므로 Edge 가능)

### 완료 조건
- 같은 IP에서 11번째 호출 → 429 응답 확인

---

## T-071: 보안 — 로그인 시도 제한
**Phase**: 2 | **Priority**: P1 | **Type**: UI + API  
**파일**: `app/login/page.tsx`, `app/api/auth/login/route.ts`  
**의존**: T-070a

### 목적
이메일/비밀번호 브루트포스 공격 방어.

### 요구사항
- 같은 이메일로 5회 실패 → 30분 잠금
- Upstash Redis에 `login_attempt:{email}` 카운터 저장 (TTL 30분)
- 잠금 상태 시: "30분 후 다시 시도해주세요" 메시지
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

### 요구사항
- 헤더에 "체크인 일괄 등록" 버튼
- 모달: 활성 객실 목록 + 각 행에 `input[type=time]`
- 한번에 저장: Supabase `upsert` 배치 처리
- 체크인 없는 방은 빈칸 (삭제 = null)
- "전체 같은 시간" 퀵 버튼 (예: 모두 15:00 입력)

### 완료 조건
- 10개 방 체크인 시간을 모달에서 한 번에 저장
- 저장 후 현황판 카드에 즉시 반영

---

## T-081a: 현황판 UX — 배정 인라인 칩 + 데스크탑 드롭다운
**Phase**: 2 | **Priority**: P2 | **Type**: UI  
**파일**: `app/admin/AdminDashboard.tsx`

### 목적
배정 UX 단순화 — 데스크탑에서 카드 클릭 → 인라인 드롭다운으로 즉시 배정.

### 요구사항
- 객실 카드에 직원 이름 칩(chip) 표시 (배정 시)
- 칩 클릭 → 직원 변경 드롭다운 (모달 없이 인라인)
- 미배정 카드 클릭 → 직원 선택 드롭다운 바로 표시
- 배정 취소: 칩 옆 X 버튼
- 데스크탑 기준 (모바일 처리는 T-081b)

### 완료 조건
- 배정 흐름: 카드 클릭 → 직원 선택 → 확정까지 3초 이내 (데스크탑)

---

## T-081b: 현황판 UX — 배정 모바일 바텀시트
**Phase**: 2 | **Priority**: P2 | **Type**: UI  
**파일**: `app/admin/AdminDashboard.tsx`  
**의존**: T-081a

### 목적
모바일에서 배정 시 바텀시트 UI 제공.

### 요구사항
- 모바일(`max-w-md` 이하)에서 드롭다운 대신 바텀시트 슬라이드업
- 바텀시트: 직원 목록 풀스크린 하단에서 올라옴
- 배경 클릭 시 닫힘
- Tailwind `translate-y` + `transition` 애니메이션

### 완료 조건
- 모바일에서 카드 탭 → 바텀시트 슬라이드업
- 직원 선택 → 배정 완료 + 바텀시트 닫힘

---

## T-082: 현황판 UX — 객실 상태 일괄 변경
**Phase**: 2 | **Priority**: P2 | **Type**: UI + API  
**파일**: `app/admin/AdminDashboard.tsx`, `app/api/admin/rooms/bulk-status/route.ts`

### 목적
층 전체 또는 선택된 방들의 상태를 한 번에 변경.

### 요구사항
- 현황판에 "일괄 변경" 모드 토글 버튼
- 활성화 시: 각 카드에 체크박스 표시
- 체크된 방 선택 후 상태 선택 드롭다운 (`dirty / cleaning / done / inspect`)
- "적용" 버튼 → `PATCH /api/admin/rooms/bulk-status`
  - body: `{ roomIds: string[]; status: string }`
  - 관리자 세션 확인 후 Supabase update
- 층 필터 버튼: "3층 전체 선택" 퀵 버튼

### 완료 조건
- 3개 방 선택 → 상태 일괄 dirty 변경 → 현황판 즉시 반영

---

## T-009: PWA — 홈 화면 설치 유도 배너
**Phase**: 2 | **Priority**: P2 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`, `app/worker/guest/GuestDashboard.tsx`

### 목적
직원이 홈 화면에 앱을 추가하면 푸시 알림을 받을 수 있음. 미설치 직원에게 설치를 유도.  
`PWA_하우스키핑.md` 섹션 8에 "현재 미구현. 향후 추가 권장"으로 명시됨.

### 요구사항
- **Android Chrome**: `beforeinstallprompt` 이벤트 캡처
  ```ts
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  ```
  - 이벤트 캡처 시 하단에 배너 표시: "홈 화면에 추가하면 배정 알림을 받을 수 있습니다" + [추가] 버튼
  - [추가] 클릭 → `installPrompt.prompt()` 호출
  - 설치 후 또는 닫기 클릭 → 배너 숨김 (localStorage에 `pwa_install_dismissed=true` 저장)
- **iOS Safari**: 자동 프롬프트 불가 → 수동 안내 팝업
  - `navigator.standalone === false` + iOS 감지 시 안내 팝업
  - 내용: "Safari 하단 [공유] → [홈 화면에 추가]를 눌러주세요"
  - 이미 설치됨 (`navigator.standalone === true`) → 배너 비표시
- localStorage에 dismissed 기록 → 한 번 닫으면 다시 안 나옴

### 완료 조건
- Android Chrome에서 배너 표시 + [추가] 클릭 → 설치 프롬프트 출현
- iOS Safari에서 안내 팝업 표시
- `navigator.standalone === true` (설치된 상태) → 배너 미표시

---

## T-015: 푸시 알림 — 체크인 초과 overdue 알림
**Phase**: 2 | **Priority**: P1 | **Type**: API  
**파일**: `app/api/push/admin-alert/route.ts`  
**의존**: T-010b, T-014a

### 목적
체크인 시간이 **이미 지났는데** 방이 아직 dirty 상태 → 관리자에게 알림.  
`에러케이스.md` ROOM-02에서 `alert_type = 'overdue'`로 `urgent_2h`와 **별개** 처리로 명시됨.

### 요구사항
- T-014b의 60초 폴링 API에 overdue 체크 로직 추가:
  - overdue 방 조회: `checkin_time < now() AND status != 'done'`
  - `room_logs`에 `alert_type = 'overdue'` 없는 경우만 발송 (중복 방지)
  - `urgent_2h`와 **독립적** — 두 알림 모두 1회씩 발송 가능 (같은 방도 양쪽 다 받을 수 있음)
  - 발송 후 room_logs에 `alert_type = 'overdue'` 기록
- 현황판 UI에서도 overdue 방 강조 표시:
  - `urgent_2h` 긴급: 빨간 테두리 + "긴급" 텍스트
  - `overdue`: 빨간 테두리 + "초과" 텍스트 (다른 뱃지)

### 완료 조건
- 체크인 시간이 지난 dirty 방 → 관리자 알림 수신
- `urgent_2h` 알림과 별개로 동작 (한 방에서 두 알림 모두 수신 가능)
- 같은 방 overdue 알림 2회 이상 발송 안됨

---

## T-017: PWA — Background Sync (오프라인 상태 변경 자동 재전송)
**Phase**: 2 | **Priority**: P2 | **Type**: Config  
**파일**: `worker/index.js`, `app/worker/[staffId]/WorkerDashboard.tsx`

### 목적
직원이 오프라인 중 [완료] 버튼을 눌렀다면, 온라인 복구 시 자동으로 서버에 재전송.  
`PWA_하우스키핑.md` 섹션 10에 "Phase 2 예정"으로 명시됨.

### 요구사항
- 서비스 워커 Background Sync API 사용:
  - 오프라인 중 상태 변경 시도 → IndexedDB에 `{ roomId, status, timestamp }` 저장
  - `navigator.serviceWorker.ready.then(sw => sw.sync.register('room-status-sync'))` 등록
- `worker/index.js`에 `sync` 이벤트 핸들러 추가:
  ```js
  self.addEventListener('sync', event => {
    if (event.tag === 'room-status-sync') {
      event.waitUntil(flushPendingStatusChanges())
    }
  })
  ```
- `flushPendingStatusChanges()`: IndexedDB에서 미전송 변경 조회 → `/api/worker/status` 재요청 → 성공 시 IndexedDB에서 삭제
- 오프라인 시 [완료] 버튼 비활성화(T-001) 대신 낙관적 업데이트로 전환 (버튼 누르면 로컬 상태 변경, 온라인 복구 시 서버 전송)

### 완료 조건
- 오프라인 중 [완료] 클릭 → 온라인 복구 후 서버에 상태 변경 자동 반영 확인
- 브라우저 DevTools Application → Background Sync에서 등록 확인

---

## T-018: PWA — 앱 아이콘 알림 배지
**Phase**: 2 | **Priority**: P2 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`, `worker/index.js`

### 목적
배정된 방 수를 앱 아이콘에 숫자 배지로 표시.  
`PWA_하우스키핑.md` 섹션 10 "Phase 2" 항목에 명시됨.

### 요구사항
- `navigator.setAppBadge(count)` API 사용 (Chrome 81+, Android)
- WorkerDashboard에서 배정된 미완료 방 수 변경 시:
  ```ts
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(pendingRooms.length)
  }
  ```
- 모든 방 완료 시: `navigator.clearAppBadge()`
- 언마운트 시: `navigator.clearAppBadge()`
- 미지원 브라우저에서 조용히 스킵 (`'setAppBadge' in navigator` 가드)

### 완료 조건
- Android Chrome에서 배정 방 있을 때 앱 아이콘에 숫자 배지 표시
- 모든 방 완료 시 배지 사라짐

---

## T-084: Realtime 연결 상태 배너
**Phase**: 2 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/AdminDashboard.tsx`, `app/worker/[staffId]/WorkerDashboard.tsx`

### 목적
Supabase Realtime 연결이 끊길 경우 사용자에게 안내.  
`에러케이스.md` NET-02에서 "재연결 중 '연결 중...' 배너 표시"로 명시됨.

### 요구사항
- Supabase 채널 상태 구독:
  ```ts
  channel.on('system', {}, (payload) => {
    if (payload.status === 'SUBSCRIBED') setRealtimeStatus('connected')
    if (payload.status === 'CLOSED' || payload.status === 'CHANNEL_ERROR') setRealtimeStatus('disconnected')
  })
  ```
- `disconnected` 상태 시: 화면 상단에 `bg-yellow-500` 배너 — "실시간 연결이 끊겼습니다. 재연결 중..."
- `connected` 복귀 시: 배너 사라짐 + 자동 데이터 재조회
- 오프라인 배너(T-001)와 동시에 나타날 수 있음 (스택 표시 또는 우선순위: 오프라인 > Realtime 끊김)
- 관리자 화면 + 직원 화면 모두 적용

### 완료 조건
- Supabase 프로젝트를 일시 중지하면 배너 표시 확인
- 재연결 후 배너 사라지고 최신 데이터 로드

---

## T-083: 현황판 UX — 배정 드래그앤드롭
**Phase**: 2 | **Priority**: P2 | **Type**: UI  
**파일**: `app/admin/AdminDashboard.tsx`  
**의존**: T-081a

### 목적
직원 패널에서 객실 카드로 드래그해 배정.

### 요구사항
- `npm install @dnd-kit/core @dnd-kit/sortable`
- 좌측 패널: 직원 목록 (드래그 소스)
- 객실 카드: 드롭 타겟
- 드래그 중: 카드 테두리 `border-blue-400` 하이라이트
- 드롭 완료: 배정 API 호출 (기존 `POST /api/admin/assign`)
- 모바일에서는 동작 안해도 됨 (T-081b로 대체)

### 완료 조건
- 직원 칩을 카드 위에 드롭 → 배정 완료 + UI 즉시 반영

---

# Phase 3 — 정식 SaaS

---

## T-100: 다국어 — next-intl 설정
**Phase**: 3 | **Priority**: P0 | **Type**: Config  
**파일**: `next.config.js`, `middleware.ts`, `i18n/`, `messages/ko.json`

### 목적
한국어/영어/베트남어 지원 기반 설정.

### 요구사항
- `npm install next-intl`
- 로케일: `ko` (기본), `en`, `vi`
- `messages/ko.json`: 현재 하드코딩된 한국어 문자열 추출
- `middleware.ts`에 next-intl 미들웨어 통합
- `useTranslations()` 훅 적용 시작: WorkerDashboard 우선

### 완료 조건
- `/en/worker/...` 접근 시 영어 표시 (미번역 시 한국어 폴백)
- `npm run build` 에러 없음

---

## T-101: 다국어 — 영어 번역
**Phase**: 3 | **Priority**: P1 | **Type**: Content  
**파일**: `messages/en.json`  
**의존**: T-100

### 요구사항
- 직원 화면 전체 영어 번역 우선
- 호텔 업계 용어: dirty → "Checkout", cleaning → "In Progress", done → "Clean", inspect → "Inspection Needed"

### 완료 조건
- `/en/worker/...` 접근 시 영어 UI 표시

---

## T-102: 다국어 — 베트남어 번역
**Phase**: 3 | **Priority**: P1 | **Type**: Content  
**파일**: `messages/vi.json`  
**의존**: T-100

### 요구사항
- T-101과 동일 범위, 베트남어로 번역
- 직원 화면 전용 (관리자 화면 한국어 유지)

### 완료 조건
- `/vi/worker/...` 접근 시 베트남어 UI 표시

---

## T-110: PMS 연동 — 웹훅 수신
**Phase**: 3 | **Priority**: P1 | **Type**: API  
**파일**: `app/api/pms/webhook/route.ts`

### 목적
PMS 체크아웃 이벤트 수신 → 자동 dirty 전환.

### 요구사항
- `POST /api/pms/webhook`:
  - `X-Roomly-Webhook-Secret` 헤더 인증 (hotel별 시크릿)
  - 이벤트 `checkout` → room status = 'dirty'
  - 이벤트 `checkin_updated` → room.checkin_time 업데이트
- `hotels.webhook_secret TEXT` 컬럼 추가 (마이그레이션)
- 관리자 설정 페이지에서 웹훅 URL + 시크릿 확인 가능

### 완료 조건
- curl로 체크아웃 이벤트 전송 → DB room.status = 'dirty'
- 잘못된 시크릿 → 401

---

## T-111: PMS 연동 — Mews 어댑터
**Phase**: 3 | **Priority**: P2 | **Type**: API  
**파일**: `lib/pms/mews.ts`, `app/api/pms/mews/route.ts`  
**의존**: T-110

### 요구사항
- Mews `ReservationUpdated` 이벤트 → Roomly 내부 포맷 변환
- 방 번호 매핑: Mews `ResourceId` ↔ Roomly `room.number` (관리자 설정에서 매핑 관리)
- `lib/pms/mews.ts`: 변환 함수

### 완료 조건
- Mews 테스트 환경 웹훅 → Roomly 방 상태 변경 확인

---

## T-112: PMS 연동 — Cloudbeds 어댑터
**Phase**: 3 | **Priority**: P2 | **Type**: API  
**파일**: `lib/pms/cloudbeds.ts`, `app/api/pms/cloudbeds/route.ts`  
**의존**: T-110

### 목적
Cloudbeds PMS 웹훅 포맷을 Roomly 내부 포맷으로 변환.

### 요구사항
- Cloudbeds Webhook `reservation.checkout` 이벤트 파싱
- room_number 추출 → T-110 표준 포맷으로 변환 후 내부 처리
- `lib/pms/cloudbeds.ts`: 변환 함수
- 서명 검증: `X-Cloudbeds-Signature` 헤더

### 완료 조건
- Cloudbeds 테스트 페이로드로 POST → room status dirty 전환

---

## T-120: 비품 관리 — DB 스키마
**Phase**: 3 | **Priority**: P1 | **Type**: DB  
**파일**: `supabase/migrations/004_supplies.sql`

### 요구사항
- `supplies` 테이블: id, hotel_id, name, unit, stock, min_stock
- `supply_requests` 테이블: id, hotel_id, room_id, staff_id, supply_id, quantity, requested_at
- RLS: supplies는 hotel 관리자만 INSERT/UPDATE, 직원은 SELECT만
- supply_requests: 직원이 INSERT (본인 hotel만), 관리자가 SELECT

### 완료 조건
- 마이그레이션 실행 → 테이블 생성 확인
- 다른 hotel 직원이 조회 불가 (RLS 검증)

---

## T-121: 비품 관리 — 직원 요청 UI
**Phase**: 3 | **Priority**: P1 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`  
**의존**: T-120

### 요구사항
- "완료" 버튼 → 메모 모달 → "비품 기록" 섹션 추가
- 호텔 비품 목록 조회 (`GET /api/worker/supplies`)
- 수량 선택 후 `supply_requests` INSERT
- 선택 없이 완료도 가능

### 완료 조건
- 수건 3개 기록 → supply_requests 테이블 확인

---

## T-122: 비품 관리 — 재고 현황판
**Phase**: 3 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/supplies/page.tsx`  
**의존**: T-120, T-121

### 요구사항
- `/admin/supplies` 신규 페이지 (AdminNav에 추가)
- 비품 목록 테이블: 품목명, 현재 재고, 오늘 사용량, 추가/수정 버튼
- 재고 < min_stock 시 빨간 강조
- 비품 추가/수정 모달
- 오늘 사용된 비품 내역 (room별 상세)

### 완료 조건
- 비품 추가 → 목록 표시
- 직원 요청 후 재고 수량 감소 확인

---

## T-130: 유지보수 신고 — DB + API
**Phase**: 3 | **Priority**: P1 | **Type**: DB + API  
**파일**: `supabase/migrations/005_maintenance.sql`, `app/api/worker/maintenance/route.ts`

### 요구사항
- `maintenance_requests` 테이블 (로드맵 DDL 참고)
- `POST /api/worker/maintenance`: body `{ roomId, description, photoUrl? }` → INSERT
- 사진 업로드: Supabase Storage `maintenance-photos` 버킷
- RLS: 직원 INSERT만, 관리자 SELECT/UPDATE

### 완료 조건
- POST → DB 레코드 생성 확인

---

## T-131: 유지보수 신고 — 직원 UI
**Phase**: 3 | **Priority**: P1 | **Type**: UI  
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`  
**의존**: T-130

### 요구사항
- 각 객실 카드에 "수리 신고" 아이콘 버튼
- 클릭 → 모달: 설명 텍스트 + 사진 첨부
- `<input type="file" accept="image/*" capture="environment">` (카메라 바로 열기)
- 제출 → "신고가 접수되었습니다" 토스트

### 완료 조건
- 사진 없이 설명만으로 신고 가능
- 사진 포함 신고 → Supabase Storage 업로드 확인

---

## T-132: 유지보수 신고 — 관리자 처리 UI
**Phase**: 3 | **Priority**: P1 | **Type**: UI  
**파일**: `app/admin/maintenance/page.tsx`  
**의존**: T-130

### 요구사항
- `/admin/maintenance` 신규 페이지 (AdminNav에 추가)
- 신고 목록: 방 번호, 설명, 신고 직원, 시간, 사진 썸네일, 상태
- 상태 변경: open → in_progress → resolved
- 처리 완료 시 `resolved_at` 기록
- 미처리 신고 수 AdminNav 배지 표시

### 완료 조건
- 상태 변경 → DB 반영 확인

---

## T-140: 공개 API — 키 발급 시스템
**Phase**: 3 | **Priority**: P2 | **Type**: UI + API  
**파일**: `app/admin/settings/page.tsx`, `app/api/admin/api-keys/route.ts`

### 요구사항
- `api_keys` 테이블 (로드맵 DDL 참고)
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

### 요구사항
- `GET /api/v1/rooms`: 전체 객실 목록 + 현재 상태
- `PATCH /api/v1/rooms/{id}`: 객실 상태 변경
- `GET /api/v1/assignments`: 활성 배정 목록
- 인증: T-140의 API 키
- Rate Limit: 키당 100회/분
- 응답: camelCase JSON, ISO 날짜

### 완료 조건
- API 키로 `GET /api/v1/rooms` → JSON 반환
- 잘못된 키 → 401

---

## T-142: 공개 API — Swagger 문서
**Phase**: 3 | **Priority**: P2 | **Type**: Config  
**파일**: `app/api/v1/docs/route.ts`, `lib/swagger.ts`  
**의존**: T-141

### 목적
PMS 업체가 연동 시 참조할 API 문서 자동 생성.

### 요구사항
- `npm install swagger-jsdoc swagger-ui-react`
- `lib/swagger.ts`: OpenAPI 3.0 스펙 정의 (GET /rooms, PATCH /rooms/{id}, GET /assignments)
- `GET /api/v1/docs`: Swagger UI 렌더링
- 각 엔드포인트에 JSDoc 주석으로 스펙 추가
- 인증 헤더 설명 포함 (Bearer token)

### 완료 조건
- `/api/v1/docs` 접근 시 Swagger UI 표시
- "Try it out"으로 실제 API 호출 가능

---

## T-150: 체인 호텔 — 법인 계정 DB
**Phase**: 3 | **Priority**: P2 | **Type**: DB  
**파일**: `supabase/migrations/006_organizations.sql`

### 요구사항
- `organizations` 테이블: id, name, plan='enterprise', created_at
- `hotels.org_id UUID REFERENCES organizations(id)` 컬럼 추가
- RLS: 법인 관리자는 소속 hotel 전체 조회 가능

### 완료 조건
- 마이그레이션 실행 → 테이블/컬럼 생성 확인

---

## T-151: 체인 호텔 — 멀티 프로퍼티 현황판
**Phase**: 3 | **Priority**: P2 | **Type**: UI + API  
**파일**: `app/org/[orgId]/page.tsx`  
**의존**: T-150

### 요구사항
- 호텔별 완료율 비교 (오늘 기준)
- 호텔별 미완료 방 수, 진행 중 방 수
- 호텔 클릭 → 해당 호텔 `/admin` 이동
- 30초 폴링 또는 Realtime 업데이트

### 완료 조건
- 법인 계정으로 3개 호텔 현황 동시 표시

---

## T-024: 결제 — 연 단위 구독 (2개월 무료)
**Phase**: 3 | **Priority**: P1 | **Type**: UI + API  
**파일**: `app/admin/billing/page.tsx`, `app/api/billing/create-session/route.ts`  
**의존**: T-021a, T-021b

### 목적
연 단위 결제 도입으로 고객 장기 유지율 향상.  
`기획서.md` 수익 모델 표에 "연 단위 (2개월 무료)" 명시됨.

### 요구사항
- Stripe Dashboard에서 연 단위 Price 3개 추가:
  - 스타터 연: 300,000원/년 (월 25,000원 × 12 → 2개월 무료)
  - 스탠다드 연: 700,000원/년
  - 프로 연: 1,500,000원/년
- 환경변수 추가: `STRIPE_PRICE_STARTER_YEARLY`, `STRIPE_PRICE_STANDARD_YEARLY`, `STRIPE_PRICE_PRO_YEARLY`
- `/admin/billing` UI에 "월간 / 연간" 토글 추가:
  - 연간 선택 시: 가격 표시 변경 + "2개월 무료" 뱃지
  - 결제 시 해당 Price ID로 Checkout 생성
- `hotels` 테이블에 `billing_interval TEXT DEFAULT 'monthly'` 컬럼 추가 (`'monthly' | 'yearly'`)

### 완료 조건
- 연간 플랜 선택 → Stripe에서 연 단위 구독 생성
- 월간/연간 가격 비교가 UI에서 명확히 표시

---

## T-160: AI 스마트 배정
**Phase**: 3 | **Priority**: P2 | **Type**: API + UI  
**파일**: `app/api/admin/suggest-assign/route.ts`, `app/admin/AdminDashboard.tsx`

### 목적
직원 과거 처리 속도 + 현재 배정량 기반 최적 배정 추천.

### 요구사항
- `GET /api/admin/suggest-assign`:
  - 오늘 미배정 방 목록 조회
  - 직원별 최근 30일 평균 처리 시간, 현재 배정 건수 집계
  - 휴리스틱 알고리즘: 처리 속도 빠른 직원에게 긴급(체크인 임박) 방 우선 배정
  - 응답: `{ suggestions: { roomId, staffId, reason }[] }`
- AdminDashboard에 "AI 배정 추천" 버튼:
  - 클릭 → 추천 결과 미리보기 모달
  - "일괄 적용" → 추천대로 배정 API 호출
  - 개별 수정 후 적용 가능

### 완료 조건
- 5개 미배정 방 + 3명 직원 환경에서 추천 결과 표시
- "일괄 적용" → 모든 방 배정 완료

---

## T-170: 네이티브 앱 — Capacitor 기본 설정
**Phase**: 3 | **Priority**: P2 | **Type**: Config  
**파일**: `capacitor.config.ts`, `ios/`, `android/`

### 목적
PWA → iOS/Android 앱 래핑 기반 설정.

### 요구사항
- `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
- `npx cap init Roomly app.roomly.io`
- `capacitor.config.ts` 생성
- `npx cap add ios && npx cap add android`
- `next build && next export` (정적 export) 후 `npx cap copy`
- `docs/` 폴더에 빌드 프로세스 문서화

### 완료 조건
- `npx cap open ios` → Xcode에서 앱 실행 가능
- `npx cap open android` → Android Studio에서 앱 실행 가능

---

## T-171: 네이티브 앱 — 네이티브 푸시 알림
**Phase**: 3 | **Priority**: P2 | **Type**: Config + API  
**파일**: `capacitor.config.ts`, `lib/push.ts`  
**의존**: T-170

### 목적
Web Push 대신 APNs(iOS) + FCM(Android) 네이티브 푸시 사용.

### 요구사항
- `npm install @capacitor/push-notifications`
- iOS: APNs 인증서 설정 가이드 문서화
- Android: `google-services.json` 설정 가이드 문서화
- FCM을 통해 서버에서 네이티브 푸시 발송하도록 `lib/push.ts` 확장:
  - 웹 구독 있으면 Web Push
  - FCM 토큰 있으면 FCM 발송
- `push_subscriptions` 테이블에 `fcm_token TEXT` 컬럼 추가

### 완료 조건
- iOS 시뮬레이터에서 푸시 수신 (개발 환경)
- Android 에뮬레이터에서 푸시 수신

---

## T-172: 네이티브 앱 — 스토어 배포 준비
**Phase**: 3 | **Priority**: P2 | **Type**: Config  
**파일**: `ios/`, `android/`  
**의존**: T-170, T-171

### 목적
앱스토어/플레이스토어 제출을 위한 빌드 준비.

### 요구사항
- 앱 아이콘 생성: 1024×1024 원본 → Capacitor 자동 리사이즈 (`@capacitor/assets`)
- 스플래시 스크린 설정
- iOS: Provisioning Profile, App Store Connect 앱 등록 가이드
- Android: 서명 키스토어 생성, Play Console 앱 등록 가이드
- 버전 관리: `package.json` version을 `capacitor.config.ts`와 동기화
- 빌드 스크립트: `scripts/build-ios.sh`, `scripts/build-android.sh`

### 완료 조건
- iOS Release 빌드 성공 (Xcode Archive)
- Android AAB 빌드 성공

---

## 티켓 의존성 요약

```
T-006, T-007, T-008 (문서 업데이트) — 독립 실행

T-004a → T-004b

T-010a (VAPID + 서비스워커)
  └── T-010b (lib/push.ts)
        ├── T-013 (배정 시 발송)
        ├── T-014b (urgent_2h 긴급 알림)
        └── T-015 (overdue 초과 알림)  ← T-014b와 같은 API에 통합

T-010a + T-011 (구독 API)
  ├── T-012 (직원 벨 버튼)
  │     └── T-009 (홈 화면 설치 배너)
  └── T-014a (관리자 벨 버튼)
        └── T-014b + T-015

T-020a (Stripe 설치)
  └── T-020b (DB 마이그레이션)
        ├── T-021a (결제 UI)
        ├── T-021b (create-session API)
        ├── T-022 (웹훅)
        │     └── T-032 (영수증 이메일)
        └── T-023b (플랜 한도)

T-022 → T-023a (만료 미들웨어)

T-021a + T-021b → T-024 (연 단위 결제) [Phase 3]

T-030a (Resend 설치)
  ├── T-030b (환영 이메일)
  ├── T-031a (리포트 템플릿)
  │     └── T-031b (cron API)
  └── T-032 (영수증 이메일)

T-040a (기간 탭 + 주간)
  ├── T-040b (월간)
  └── T-042 (직원 성과)

T-050a (라우팅 분리)
  ├── T-050b (Hero + 기능)
  │     └── T-050c (요금제 + CTA)
  └── T-051 (SEO)

T-060a (슈퍼어드민 로그인)
  └── T-060b (호텔 목록)
        ├── T-060c (라이선스)
        └── T-061 (수익 현황)

T-070a (Upstash 설정)
  ├── T-070b (Rate Limit 미들웨어)
  └── T-071 (로그인 제한)

T-081a (인라인 칩)
  ├── T-081b (모바일 바텀시트)
  └── T-083 (드래그앤드롭)

T-001 (오프라인 배너) → T-017 (Background Sync) [T-001 완료 후 개선]

T-110 (PMS 웹훅)
  ├── T-111 (Mews)
  └── T-112 (Cloudbeds)

T-120 (비품 DB)
  ├── T-121 (직원 UI)
  └── T-122 (관리자 UI)

T-130 (유지보수 DB)
  ├── T-131 (직원 UI)
  └── T-132 (관리자 UI)

T-140 (API 키)
  └── T-141 (REST API)
        └── T-142 (Swagger)

T-150 (법인 DB) → T-151 (멀티 현황판)

T-170 (Capacitor)
  └── T-171 (네이티브 푸시)
        └── T-172 (스토어 배포)
```

---

## 병렬 실행 가능 그룹

| 그룹 | 티켓 |
|---|---|
| Phase 1 문서 | T-006, T-007, T-008 (동시) |
| Phase 1 UI 동시 | T-001, T-002, T-003, T-004a, T-005 |
| Phase 1 순차 | T-004b (T-004a 완료 후) |
| Phase 2 인프라 동시 | T-010a, T-020a, T-030a, T-070a |
| Phase 2 인프라 후속 | T-010b (T-010a 후), T-020b (T-020a 후), T-030b (T-030a 후), T-070b (T-070a 후) |
| Phase 2 기능 동시 | T-011, T-050a, T-060a, T-080, T-082, T-084 |
| Phase 2 PWA 순차 | T-009 (T-012 후), T-017 (T-001 후), T-018 (T-012 후) |
| Phase 2 푸시 순차 | T-014b 완료 후 T-015 (같은 API에 통합) |
| Phase 2 랜딩 순차 | T-050a → T-050b → T-050c |
| Phase 2 슈퍼어드민 순차 | T-060a → T-060b → T-060c |
| Phase 2 결제 순차 | T-020b → T-021a, T-021b, T-022 (동시) → T-023a, T-023b, T-032 |
| Phase 2 통계 순차 | T-040a → T-040b, T-042 (동시) |
| Phase 3 동시 실행 | T-024, T-100, T-110, T-120, T-130, T-140, T-150, T-160, T-170 |
