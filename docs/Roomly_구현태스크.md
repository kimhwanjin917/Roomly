# Roomly 구현 태스크 목록

> 기획서·로드맵·티켓 문서 기반으로 정리한 실제 구현 단위 작업 목록.  
> Phase 2 미완료 → AI 기능 → Phase 3 순서로 진행.

---

## 현재 완료 상태 (Phase 1 + Phase 2 일부)

| 티켓 | 내용 | 상태 |
|------|------|------|
| Phase 1 전체 | 현황판, QR 인증, 온보딩, PWA 등 | ✅ 완료 |
| T-010 | 푸시 알림 인프라 (VAPID, push_subscriptions) | ✅ 완료 |
| T-020 | Stripe 결제 기반 세팅 | ✅ 완료 |
| T-030 | Resend 이메일 기반 세팅 + 환영 메일 | ✅ 완료 |
| T-050 | 랜딩 페이지 | ✅ 완료 |
| T-060 | 슈퍼어드민 대시보드 | ✅ 완료 |

---

## [긴급] 출시 전 버그 수정 (개발 시작 전 반드시 확인)

> 엔지니어링 감사 + 설계 시뮬레이션에서 발견. 이 중 하나라도 방치하면 출시 후 즉각 장애 발생.

| # | 문제 | 파일 | 심각도 | 예상 시간 |
|---|------|------|--------|----------|
| BUG-01 | `hotels` 테이블에 `stripe_customer_id`, `stripe_subscription_id`, `plan_expires_at`, `last_active_at` 컬럼 없음 → 빌링 전체 500 | Supabase SQL | Critical | 10분 |
| BUG-02 | `push_subscriptions.auth_key` → `auth`로 컬럼명 통일 필요 → 푸시 알림 전체 500 | Supabase SQL + `api/push/subscribe/route.ts` | Critical | 15분 |
| BUG-03 | `signup/route.ts`가 `plan_type`, `room_limit` 컬럼에 INSERT → 없는 컬럼이라 가입 자체가 500 | `api/auth/signup/route.ts` | Critical | 30분 |
| BUG-04 | 직원 방 상태 변경 시 배정 소유권 미확인 → 동일 호텔 직원이 남의 방 조작 가능 | `api/worker/status/route.ts` | High | 1시간 |
| BUG-05 | 게스트 방 상태 변경 시 배정 소유권 미확인 → 게스트 코드만 있으면 호텔 전체 방 조작 가능 | `api/guest/status/route.ts` | High | 1시간 |
| BUG-06 | rooms.status='done' 업데이트 시 assignments.completed_at 미업데이트 → 통계 전체 0 | `api/worker/status/route.ts`, `api/guest/status/route.ts` | High | 1시간 |
| BUG-07 | `CRON_SECRET` 미설정 시 `'Bearer undefined' === 'Bearer undefined'` → 모든 크론 API 무인증 접근 가능 | `api/cron/*/route.ts` 전체 | High | 30분 |
| BUG-08 | Dirty Worker가 cleaning 상태 방도 dirty로 변경 가능 → 진행 중인 청소 무효화 | `api/worker/dirty/status/route.ts` | High | 30분 |
| BUG-09 | Stripe checkout.session.completed에서 plan_expires_at = now()+30일 하드코딩 → 연간 플랜도 30일로 저장 | `api/billing/webhook/route.ts` | High | 1시간 |
| BUG-10 | `signup/route.ts`에서 `listUsers()` 전체 조회로 이메일 중복 체크 → 1,000명 초과 시 중복 가입 허용 | `api/auth/signup/route.ts` | High | 2시간 |
| BUG-11 | `roomly_worker_session` 쿠키에 `maxAge` 없음 → 세션 쿠키로 발급되어 PWA 재시작 시 갑자기 로그아웃 | `api/auth/qr/route.ts` | Medium | 30분 |
| BUG-12 | `worker/guest status` API에 `VALID_STATUSES` 검증 없음 → 잘못된 값 입력 시 DB CHECK 에러로 5xx 노출 | 두 route.ts | Low | 30분 |
| BUG-13 | ✅ `hotels.admin_email` 컬럼 누락 → 모든 가입 500, 온보딩/결제 크론 이메일 0건 | `005_patch.sql` | Critical | 10분 (수정됨) |
| BUG-14 | ✅ `hotels.room_limit` 없는 컬럼 참조 → 모든 호텔 10개 객실 한도로 잠김 | `rooms/route.ts`, `rooms/bulk/route.ts` | Critical | 20분 (수정됨) |
| BUG-15 | ✅ `middleware.ts` `/admin/billing/toss-success` 미제외 → 결제 후 만료 화면 루프 | `middleware.ts` | High | 5분 (수정됨) |
| BUG-16 | ✅ `billing/webhook.ts` `setMonth()` 오버플로우 → 1/31 결제 시 만료일 3/3 | `billing/webhook/route.ts` | High | 10분 (수정됨) |
| BUG-17 | ✅ `billing-charge` 크론 결제 실패 시 플랜 다운그레이드 없음 → 미결제 호텔 접근 유지 | `cron/billing-charge/route.ts` | Medium | 15분 (수정됨) |

### BUG-01 수정 SQL (Supabase SQL Editor에서 실행)

```sql
-- hotels 테이블: 토스페이먼츠 + 온보딩 추적 컬럼 추가
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS toss_customer_key  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS toss_billing_key   TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active_at     TIMESTAMPTZ;

-- subscription_plan CHECK 제약 수정: 'trial' 값 추가
ALTER TABLE hotels DROP CONSTRAINT IF EXISTS hotels_subscription_plan_check;
ALTER TABLE hotels ADD CONSTRAINT hotels_subscription_plan_check
  CHECK (subscription_plan IN ('trial', 'starter', 'standard', 'pro'));

-- 기존 hotels의 subscription_plan 기본값도 'trial'로 변경
ALTER TABLE hotels ALTER COLUMN subscription_plan SET DEFAULT 'trial';
```

### BUG-02 수정 SQL

```sql
-- push_subscriptions 테이블이 이미 생성된 경우
ALTER TABLE push_subscriptions RENAME COLUMN auth_key TO auth;
-- 새로 만드는 경우: DDL에서 이미 auth로 정의됨
```

### BUG-03 수정 코드 (`api/auth/signup/route.ts`)

```ts
// ❌ 잘못된 코드
await service.from('hotels').insert({ name, plan_type: 'starter', room_limit: 50 })

// ✅ 올바른 코드
await service.from('hotels').insert({ name, subscription_plan: 'starter' })
// room_limit은 컬럼 없음. 플랜별 제한은 애플리케이션에서 도출
```

### BUG-07 수정 코드 (모든 크론 route.ts)

```ts
// ❌ 취약한 코드
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }
// process.env.CRON_SECRET이 undefined → 'Bearer undefined' === 'Bearer undefined' → 인증 통과

// ✅ 올바른 코드
if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}
```

---

## Phase 2 — 남은 작업 (우선순위 순)

### [P0] T-011: 푸시 알림 구독 API
**파일**: `app/api/push/subscribe/route.ts` (신규)  
**의존**: T-010 완료됨

**구현할 것:**
- `POST /api/push/subscribe`
  - `roomly_worker_session` 쿠키 파싱 → staffId 추출
  - body: `{ subscription: { endpoint, keys: { p256dh, auth } } }`
  - `push_subscriptions` 테이블 UPSERT (staff_id 기준)
  - 반환: `200 { ok: true }`
- `DELETE /api/push/subscribe`
  - staffId로 push_subscriptions 삭제
  - 반환: `200 { ok: true }`
- 관리자 구독: Supabase Auth user_id 기반, `is_admin: true`

**완료 조건:**
- JWT 쿠키 없이 POST → 401
- 유효한 JWT로 POST → DB 레코드 생성
- DELETE → DB 레코드 삭제

---

### [P0] T-013: 배정 시 푸시 자동 발송
**파일**: `app/api/admin/assign/route.ts`, `lib/push.ts` (신규)  
**의존**: T-011

**구현할 것:**
- `lib/push.ts` 생성:
  - `sendPushToStaff(staffId, payload)` 함수
  - push_subscriptions에서 staffId로 구독 조회
  - `webpush.sendNotification()` 호출
  - 410 Gone 응답 → DB에서 해당 구독 삭제
  - VAPID 환경변수 없으면 조용히 스킵
- `app/api/admin/assign/route.ts` 수정:
  - 배정 성공 후 `sendPushToStaff()` 비동기 호출 (`.catch(() => {})`)
  - 알림 실패해도 배정 자체는 성공으로 처리

**알림 내용:**
```
title: `{room.number}호 배정됨`
body: `{room.floor}층 · 청소를 시작해주세요`
url: `/worker/{staffId}`
tag: `assign-{staffId}`
```

**완료 조건:**
- 관리자가 직원 배정 → 직원 폰에 알림 수신

---

### [P1] T-012: 직원 벨 버튼 UI
**파일**: `app/worker/[staffId]/WorkerDashboard.tsx`  
**의존**: T-011

**구현할 것:**
- 알림 상태 타입: `'idle' | 'subscribed' | 'denied' | 'unsupported'`
- 마운트 시: `Notification.permission` 확인만 (자동 요청 금지)
- 헤더 우상단 벨 아이콘 버튼:
  - `idle`: outline 벨 → 클릭 시 `requestPermission` 후 구독
  - `subscribed`: 파란 채워진 벨 → 클릭 시 구독 취소
  - `denied`: 회색 X 벨, 비활성 (title="브라우저 설정에서 알림을 허용해주세요")
  - `unsupported`: 버튼 숨김
- 구독 성공 → `POST /api/push/subscribe` 호출
- 구독 취소 → `DELETE /api/push/subscribe` 호출
- `urlBase64ToUint8Array` 유틸 함수 파일 내 포함

**완료 조건:**
- 벨 클릭 → 브라우저 알림 권한 팝업 (모바일 포함)
- 허용 후 DB push_subscriptions 레코드 생성 확인

---

### [P1] T-014: 관리자 긴급 알림
**파일**: `app/admin/AdminDashboard.tsx`, `app/api/push/admin-alert/route.ts` (신규)  
**의존**: T-011

**구현할 것:**
- `/admin` 헤더에 관리자 벨 버튼 추가 (T-012와 동일 패턴, `is_admin: true`)
- 클라이언트 60초 폴링으로 긴급 방 감지:
  - `room_logs`에 `alert_type = 'urgent_2h'` 레코드 없는 경우만 발송 (중복 방지)
  - 발송 후 room_logs에 `alert_type = 'urgent_2h'` 기록
- `POST /api/push/admin-alert` 신규 엔드포인트:
  - 관리자 Supabase 세션 필요
  - 긴급 방 목록 조회 → 관리자 구독으로 푸시 발송

**완료 조건:**
- 체크인 2시간 이내 미완료 방 + 관리자 구독 시 → 알림 수신
- 같은 방에 알림 2회 이상 발송 안 됨

---

### [P0] T-023: 결제 플랜 만료 잠금
**파일**: `middleware.ts`, `app/admin/AdminDashboard.tsx`  
**의존**: T-022 (webhook 처리)

**구현할 것:**
- `middleware.ts`에서 `/admin` 접근 시 `hotels.plan_expires_at` 확인:
  - 만료 → `/admin/billing?expired=true` 리다이렉트
  - `/admin/billing`, `/admin/settings` 경로는 항상 허용
- `/admin/billing?expired=true` 진입 시 "구독이 만료되었습니다" 배너
- 플랜별 객실 수 제한:
  - 스타터: 50개 초과 시 추가 등록 차단 (`app/admin/rooms/page.tsx`)
  - 스탠다드: 150개 초과 시 동일 처리

**완료 조건:**
- 만료 호텔이 /admin 접근 → billing 페이지로 리다이렉트
- 무료 체험 기간 내 → 정상 접근

---

### [P1] T-031: 일일 리포트 이메일 크론
**파일**: `app/api/cron/daily-report/route.ts`, `emails/DailyReportEmail.tsx`  
**의존**: T-030 완료됨

**구현할 것:**
- `app/api/cron/daily-report/route.ts`:
  - `GET` 메서드 (Vercel Cron 호출)
  - `Authorization: Bearer {CRON_SECRET}` 헤더 인증
  - 전체 hotel 목록 조회
  - 각 hotel의 전날(KST) 완료 통계 집계
  - 직원별 처리 건수, 평균 처리 시간
  - `sendEmail()` 호출
- `vercel.json` cron 추가:
  ```json
  { "path": "/api/cron/daily-report", "schedule": "0 23 * * *" }
  ```
  (UTC 23:00 = KST 08:00)
- `emails/DailyReportEmail.tsx`:
  - 어제 날짜, 완료율, 직원별 요약 테이블
  - React Email 컴포넌트

**완료 조건:**
- `GET /api/cron/daily-report` 호출 → 이메일 수신
- Vercel 대시보드 Cron Jobs에서 스케줄 확인

---

### [P1] T-040: 통계 주간/월간 차트
**파일**: `app/admin/stats/page.tsx`

**구현할 것:**
- `npm install recharts`
- 기간 탭: `일` / `주` / `월` (기본: 일)
- 주간 뷰: 최근 7일 날짜별 완료 건수 BarChart
- 월간 뷰: 최근 30일 날짜별 완료 건수 + 이동 평균선 LineChart
- 차트 컴포넌트는 `'use client'`로 분리 (SSR 대응)
- 색상: 완료 `#10b981`, 미완료 `#e2e8f0`

**완료 조건:**
- 탭 전환 시 차트 데이터 변경 확인
- 모바일에서 차트 가로 스크롤 또는 축소 표시

---

### [P2] T-041: CSV 내보내기
**파일**: `app/admin/stats/page.tsx`, `app/api/admin/stats/export/route.ts` (신규)

**구현할 것:**
- `npm install papaparse @types/papaparse`
- 통계 페이지에 "CSV 내보내기" 버튼
- `GET /api/admin/stats/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
- 응답: CSV 파일 다운로드 (`Content-Disposition: attachment`)
- CSV 컬럼: 날짜, 직원명, 완료 객실 수, 평균 처리 시간(분)
- UTF-8 BOM 처리 (엑셀 한글 깨짐 방지)

---

### [P1] T-070: API Rate Limiting
**파일**: `middleware.ts`, `lib/rateLimit.ts` (신규)

**구현할 것:**
- `npm install @upstash/redis @upstash/ratelimit`
- 환경변수: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `lib/rateLimit.ts` 생성:
  - `/api/auth/qr`, `/api/auth/guest`, `/api/auth/signup`: IP당 10회/분
  - `/api/admin/*`: 계정당 60회/분
- `middleware.ts`에서 초과 시 `429 Too Many Requests` 반환
- Vercel Edge Runtime 호환 (Upstash HTTP 기반)

**완료 조건:**
- 같은 IP에서 11번째 호출 → 429 응답

---

### [P1] T-071: 로그인 시도 제한
**파일**: `app/login/page.tsx`, `app/api/auth/login/route.ts`  
**의존**: T-070

**구현할 것:**
- 같은 이메일 5회 실패 → 30분 잠금
- Upstash Redis: `login_attempt:{email}` 카운터 (TTL 30분)
- 잠금 상태 시 "30분 후 다시 시도해주세요" 메시지
- 성공 시 카운터 리셋

---

### [P2] T-080: 체크인 시간 일괄 등록
**파일**: `app/admin/AdminDashboard.tsx`

**구현할 것:**
- 헤더에 "체크인 일괄 등록" 버튼
- 모달: 활성 객실 목록 + 각 행에 `input[type=time]`
- 한 번에 저장: Supabase `upsert` 배치 처리
- 체크인 없는 방은 빈칸 (null 저장)
- "전체 같은 시간" 퀵 버튼 (예: 모두 15:00)

---

### [P2] T-081: 배정 UX 개선
**파일**: `app/admin/AdminDashboard.tsx`

**구현할 것:**
- 객실 카드에 직원 이름 칩(chip) 표시 (배정 시)
- 칩 클릭 → 직원 변경 드롭다운 (모달 없이 인라인)
- 미배정 카드 클릭 → 직원 선택 드롭다운 바로 표시
- 배정 취소: 칩 옆 X 버튼
- 모바일: 드롭다운 대신 bottom sheet

---

## AI 기능 (Phase 2.5 — 차별화 핵심)

> 기존 PMS와 차별화되는 Roomly만의 기능. Claude API 사용.

---

### [AI-01] AI 운영 인사이트 (stats 페이지)
**파일**: `app/admin/stats/page.tsx`, `app/api/admin/ai-insight/route.ts` (신규)  
**패키지**: `npm install ai`

**구현할 것:**
- `app/api/admin/ai-insight/route.ts`:
  - 관리자 세션 확인
  - 최근 7일 통계 데이터 조회 (완료율, 직원별 처리 시간, 요일별 패턴)
  - Claude API 호출 → 인사이트 텍스트 생성
  - 스트리밍 응답
- 통계 페이지에 "AI 분석" 버튼 추가
- 클릭 시 로딩 → 인사이트 텍스트 표시

**AI에게 줄 데이터 예시:**
```
- 이번 주 평균 완료율: 72%
- 화요일 완료율: 55% (최저)
- 가장 빠른 직원: 김철수 (평균 18분)
- 가장 느린 직원: 이영희 (평균 35분)
```

**AI 출력 예시:**
```
화요일 오전 완료율이 매주 낮습니다. 이 시간대 직원 배치를 1명 추가하면
완료율이 약 15% 개선될 것으로 예상됩니다. 김철수 직원의 처리 속도가
가장 빠르므로 체크인 임박 방 우선 배정을 권장합니다.
```

---

### [AI-02] AI 스마트 배정 추천
**파일**: `app/admin/AdminDashboard.tsx`, `app/api/admin/ai-assign/route.ts` (신규)

**구현할 것:**
- `POST /api/admin/ai-assign`:
  - 현재 미배정 방 목록 (체크인 시간 포함)
  - 직원별 현재 배정 수, 과거 평균 처리 시간
  - Claude API로 최적 배정 추천
  - 반환: `[{ roomId, staffId, reason }]`
- 현황판 헤더에 "AI 배정 추천" 버튼
- 클릭 → 추천 결과 미리보기 → 확인 시 일괄 배정

**추천 기준:**
- 체크인 임박 방 우선
- 직원 현재 부하 분산
- 직원 과거 처리 속도 고려

---

### [AI-03] 일일 리포트 AI 요약
**파일**: `app/api/cron/daily-report/route.ts`, `emails/DailyReportEmail.tsx`  
**의존**: T-031

**구현할 것:**
- 일일 리포트 이메일 생성 시 Claude API 호출
- 전날 통계 데이터 → 자연어 요약 생성
- 이메일 최상단에 "오늘의 한 줄 요약" 섹션 추가

**출력 예시:**
```
어제 전체 완료율 84%, 전주 대비 12% 향상. 
102호 체크인 직전 완료 처리 위험했으나 김철수 직원이 신속 대응.
내일 체크인 예정 방이 8개로 오늘보다 많으니 오전 배정을 앞당기세요.
```

---

### [AI-04] 청소 소요 시간 예측
**파일**: `app/admin/AdminDashboard.tsx`

**구현할 것:**
- 직원 배정 시 "예상 완료 시간" 표시
- 직원의 해당 객실 타입 과거 평균 처리 시간 기반
- 체크인 시간과 비교해 "여유 있음 / 빠듯함 / 위험" 표시
- 별도 AI API 호출 없이 로컬 계산 (단순 휴리스틱)

---

## Phase 3 — 정식 SaaS

### [P1] T-100: 다국어 (next-intl)
- 한국어(기본) / 영어 / 베트남어
- 직원 화면 우선
- `npm install next-intl`

### [P1] T-110: PMS 웹훅 수신
- 체크아웃 이벤트 수신 → 자동 dirty 전환
- `POST /api/pms/webhook`
- hotel별 webhook_secret 발급

### [P1] T-120~122: 비품 관리
- 비품 재고 DB 스키마
- 직원 청소 완료 시 비품 사용 기록
- 관리자 재고 현황판

### [P1] T-130~132: 유지보수 신고
- 직원이 파손/고장 사진+메모로 신고
- 관리자 처리 현황판
- Supabase Storage 사진 업로드

### [P2] T-140~141: 공개 REST API
- API 키 발급 시스템
- `GET/PATCH /api/v1/rooms`
- PMS 업체 직접 연동용

### [P2] T-150~151: 체인 호텔
- organizations 테이블 (법인 계정)
- 멀티 프로퍼티 현황판

---

### [P0] T-025: 토스페이먼츠 결제 연동
**파일**: `app/api/billing/toss/confirm/route.ts`, `app/admin/billing/toss-success/page.tsx`, `lib/toss.ts`  
**이유**: 한국 법인 고객은 Stripe 신용카드 결제 + 세금계산서 발행이 불편. 토스페이먼츠 미연동 시 법인 고객 전환율 15~25% 손실

**구현할 것:**
- `lib/toss.ts`: 토스페이먼츠 결제 승인 API 래퍼
- `POST /api/billing/toss/confirm`: 결제 승인 + plan_expires_at 업데이트
- `/admin/billing/page.tsx`에 결제 수단 선택 UI (카드 vs 계좌이체/법인카드)
- `/admin/billing/toss-success/page.tsx`: 결제 완료 콜백 페이지

**환경변수 추가:**
```bash
TOSS_SECRET_KEY=test_sk_...
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
```

---

### [P1] T-032: 온보딩 이메일 시퀀스 (D+1, D+3, D+7, D+83)
**파일**: `app/api/cron/onboarding-d1/route.ts`, `app/api/cron/onboarding-d3/route.ts`, `app/api/cron/onboarding-d7/route.ts`, `app/api/cron/trial-ending/route.ts`  
**의존**: T-030 완료됨, BUG-01 (last_active_at, staff.first_accessed_at 컬럼 필요)

**구현할 것:**

| 크론 | 스케줄 (UTC) | 조건 | 이메일 내용 |
|------|------------|------|------------|
| onboarding-d1 | `0 10 * * *` (KST 19:00) | 가입 24~48h + `rooms` COUNT = 0 | 객실 미등록 리마인더 + 일괄 등록 가이드 |
| onboarding-d3 | `0 10 * * *` | 가입 72~96h + 직원 있음 + `assignments` COUNT = 0 (first_accessed_at IS NULL) | QR 공유 확인 + iOS 가이드 |
| onboarding-d7 | `0 10 * * *` | 가입 7~8일 + completed_at 있는 배정 1건 이상 | 첫 주 완료 통계 리포트 |
| trial-ending | `0 9 * * *` (KST 18:00) | `plan_expires_at` 7일 이내 | 체험 종료 통계 + 요금제 선택 CTA |

**vercel.json 크론 전체 목록 (통합):**
```json
{
  "crons": [
    { "path": "/api/cron/onboarding-d1",  "schedule": "0 10 * * *" },
    { "path": "/api/cron/onboarding-d3",  "schedule": "0 10 * * *" },
    { "path": "/api/cron/onboarding-d7",  "schedule": "0 10 * * *" },
    { "path": "/api/cron/trial-ending",   "schedule": "0 9  * * *" },
    { "path": "/api/cron/daily-report",   "schedule": "0 23 * * *" },
    { "path": "/api/cron/billing-charge", "schedule": "0 0  * * *" },
    { "path": "/api/cron/weekly-report",  "schedule": "0 0  * * 1" },
    { "path": "/api/cron/churn-feedback", "schedule": "0 10 * * *" }
  ]
}
```

---

## 구현 순서 (추천)

```
0주차 (지금 당장): BUG-01~12 전체 수정 (DB 마이그레이션 + 코드 수정)
                  → 이거 안 하면 개발 시작할 수 없음

1주차: T-011 → T-013 → T-012 → T-014  (푸시 알림 완성)
2주차: T-023 → T-025 → T-031           (결제 잠금 + 토스 + 이메일)
3주차: T-032 → T-040                   (온보딩 크론 + 차트)
4주차: AI-01 → AI-02 → AI-03          (AI 기능 — 차별화)
5주차: T-070 → T-071 → T-041 → T-080  (보안 + UX 마무리)
이후: Phase 3 순차 진행
```

---

## 환경변수 체크리스트

Phase 2 남은 것:
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `VAPID_EMAIL`
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `CRON_SECRET`

AI 기능 추가:
- [ ] `ANTHROPIC_API_KEY`
