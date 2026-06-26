# Roomly 엔지니어링 감사 보고서

> 검토 기준일: 2026-06-25  
> 검토 범위: `app/api/**`, `middleware.ts`, `lib/`, `docs/`  
> 기존 docs와 중복 최소화. 이 문서에서 다루지 않는 스펙·플로우는 `Roomly_에러케이스.md`, `Roomly_RLS정책.md`를 참조.

---

## 1. 코드 품질 감사 — 가장 위험한 코드 10

---

### [1위] 이메일 중복 체크 — `app/api/auth/signup/route.ts:19`

**문제 설명**  
`service.auth.admin.listUsers()`로 전체 유저 목록을 메모리에 올린 뒤 `.find()`로 이메일을 검색한다.

**심각도**: Critical

**근거**  
- Supabase `listUsers()`는 기본 1,000명 단위로 페이지네이션된다. 1,001번째 유저부터 검색에서 누락된다. 즉, 유저가 1,000명을 넘으면 중복 이메일로 가입이 가능해진다.  
- 가입 API가 느려짐: 유저 수에 비례해 응답 시간 증가.  
- Race condition: `listUsers()`와 `createUser()` 사이에 동일 이메일로 두 요청이 들어오면 중복 계정이 생성된다.

**해결 방법**  
```ts
// Supabase Admin API에서 이메일로 직접 조회
const { data } = await service.auth.admin.listUsers() // ❌
// ↓
const { data } = await service.from('auth.users') // 직접 쿼리 불가
// → signUp 시 Supabase가 이메일 중복을 자체 처리하므로 아래처럼 단순화
const { error: authErr } = await service.auth.admin.createUser({ email, ... })
if (authErr?.message?.includes('already registered')) {
  return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 })
}
```

**예상 효과**: 가입 속도 개선, 1,000명 이상에서의 중복 가입 취약점 제거.

---

### [2위] 직원/게스트 상태 변경 시 status 미검증 — `app/api/worker/status/route.ts:18`, `app/api/guest/status/route.ts:17`

**문제 설명**  
`worker/status`와 `guest/status`는 요청 body의 `status` 값을 DB에 그대로 쓴다. `admin/status/route.ts`는 `VALID_STATUSES.includes()` 검증이 있지만 이 두 라우트에는 없다.

**심각도**: High

**근거**  
- DB `CHECK` 제약이 있으므로 실제로 잘못된 값이 저장되지는 않지만, 5xx 에러가 클라이언트에 노출된다.  
- service_role 키로 실행하므로 RLS 검증도 받지 않는다. API 레이어에서 검증이 유일한 방어선이었어야 한다.

**해결 방법**  
```ts
const VALID_STATUSES = ['dirty', 'cleaning', 'done', 'inspect'] as const
if (!VALID_STATUSES.includes(status)) {
  return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
}
```

**예상 효과**: 잘못된 상태값 요청 시 명확한 400 반환, 5xx 노이즈 제거.

---

### [3위] 직원이 미배정 방의 상태를 변경 가능 — `app/api/worker/status/route.ts`

**문제 설명**  
API가 "내 호텔 소속 방인지"만 확인하고, "나에게 배정된 방인지"는 확인하지 않는다.

**심각도**: High

**근거**  
- service_role로 쿼리하므로 RLS의 `"직원 배정 객실 수정"` 정책이 적용되지 않는다.  
- 동일 호텔의 어떤 직원이든 모든 방의 상태를 변경할 수 있다.  
- 예: 직원 A가 직원 B의 배정 방을 `done`으로 처리해 통계를 조작할 수 있다.

**해결 방법**  
```ts
// 상태 변경 전 assignments 테이블에서 "내 배정인지" 확인
const { data: assignment } = await service
  .from('assignments')
  .select('id')
  .eq('room_id', roomId)
  .eq('staff_id', staffId)
  .is('completed_at', null)
  .is('cancelled_at', null)
  .single()
if (!assignment) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
```

**예상 효과**: 직원이 자신의 배정 방 외에 상태를 변경하는 경로 차단.

---

### [4위] 게스트가 미배정 방 상태 변경 가능 — `app/api/guest/status/route.ts`

**문제 설명**  
게스트 API도 동일 문제. "내 호텔 방인지"만 체크하고 "게스트 풀에 배정된 방인지"를 확인하지 않는다.

**심각도**: High

**근거**  
- 6자리 코드만 알면 호텔 내 모든 방의 상태를 변경할 수 있다.  
- 게스트 코드는 관리자가 외부(카톡)에 공유하므로 유출 가능성이 높다.

**해결 방법**  
```ts
const { data: assignment } = await service
  .from('assignments')
  .select('id')
  .eq('room_id', roomId)
  .eq('is_guest', true)
  .is('completed_at', null)
  .is('cancelled_at', null)
  .single()
if (!assignment) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
```

---

### [5위] Dirty Worker가 cleaning 상태 방도 dirty로 변경 가능 — `app/api/worker/dirty/status/route.ts`

**문제 설명**  
방의 현재 상태를 가져오지만(`select('id, status')`), 실제 체크 없이 모든 상태의 방을 dirty로 바꿀 수 있다.

**심각도**: High

**근거**  
- `cleaning` 상태(하우스키핑 직원이 현재 청소 중)인 방을 Dirty Worker가 `dirty`로 바꾸면, 진행 중인 청소가 무효화된다.  
- 하우스키핑 직원의 배정도 사실상 취소되는 것과 같은 효과.

**해결 방법**  
```ts
if (room.status === 'cleaning' || room.status === 'dirty') {
  return NextResponse.json({ error: 'invalid_state_transition' }, { status: 409 })
}
```

**예상 효과**: 진행 중인 청소 보호.

---

### [6위] 슈퍼어드민 세션 쿠키값 = 비밀번호 해시 — `app/api/super-admin/auth/route.ts:15`

**문제 설명**  
`super_admin_session` 쿠키의 값이 SHA-256 해시 그 자체다. 검증도 단순히 `session === SUPER_ADMIN_PASSWORD_HASH`로 문자열 비교한다.

**심각도**: High

**근거**  
- 쿠키를 탈취하면 그것이 곧 "비밀번호 증명"이다.  
- SHA-256은 단방향 해시이지만, 레인보우 테이블 공격에 취약하다 (salt 없음).  
- 개발자 도구에서 쿠키를 복사하면 다른 기기에서 세션 재사용 가능.  
- 슈퍼어드민 엔드포인트(`/api/super-admin/*`)에 Rate Limiting이 없다.

**해결 방법**  
```ts
// 랜덤 세션 ID를 발급하고 서버측 Map/Redis에 저장
import { randomBytes } from 'crypto'
const sessionId = randomBytes(32).toString('hex')
// 서버 메모리 또는 KV에 sessionId → 인증시각 저장
res.cookies.set('super_admin_session', sessionId, { httpOnly: true, secure: true })
```

---

### [7위] 미들웨어에서 Supabase 직접 HTTP 호출 — `middleware.ts:29`

**문제 설명**  
모든 `/admin` 페이지 요청마다 `fetch(supabaseUrl + '/rest/v1/hotels?...')` 를 동기적으로 호출해 플랜 만료를 체크한다.

**심각도**: Medium

**근거**  
- 미들웨어는 모든 요청 경로에서 실행된다. 관리자가 현황판을 새로고침할 때마다 Supabase REST API를 추가 호출한다.  
- Supabase 순간적 지연 시 `/admin` 전체 응답이 느려진다.  
- `catch {}` 블록에서 만료 체크 실패를 무시해 접근을 허용하므로, Supabase 장애 시 만료된 계정이 접근 가능해진다.  
- `plan_expires_at`이 `hotels` 테이블에 없으면 `hotel?.plan_expires_at`이 undefined라 체크가 스킵된다.

**해결 방법**  
`plan_expires_at`을 Supabase Auth `app_metadata`에 저장하거나, Edge Config에 캐싱. 또는 만료 체크를 미들웨어에서 제거하고 각 관리자 페이지 서버 컴포넌트에서 처리.

---

### [8위] 일일 리포트 크론의 N+1 쿼리 — `app/api/cron/daily-report/route.ts:34`

**문제 설명**  
호텔 수(N)만큼 `for` 루프를 돌며 각 호텔별로 2개의 DB 쿼리(`rooms count` + `assignments select`)를 개별 실행한다.

**심각도**: Medium

**근거**  
- 호텔 10개: 1(hotels) + 1(listUsers) + 20(루프) = 22번 DB 호출.  
- 호텔 100개: 202번 DB 호출. Vercel Function 제한(300초)에 근접 가능.  
- 루프 안에서 `sendEmail()`도 직렬 호출. 이메일 발송 지연이 누적된다.

**해결 방법**  
```ts
// 단일 쿼리로 호텔별 통계 집계 (GROUP BY 활용)
const { data: stats } = await service
  .from('assignments')
  .select('rooms!inner(hotel_id), staff_id, assigned_at, completed_at')
  .gte('completed_at', dayStart)
  // ...
// Promise.all로 이메일 병렬 발송
await Promise.all(hotels.map(hotel => sendEmail(...)))
```

---

### [9위] Stripe 청구 주기와 plan_expires_at 불일치 — `app/api/billing/webhook/route.ts:27`

**문제 설명**  
`checkout.session.completed` 이벤트에서 `plan_expires_at`을 `Date.now() + 30일`로 하드코딩한다.

**심각도**: Medium

**근거**  
- 연간 플랜 구독자도 30일 만료로 저장된다.  
- `invoice.payment_succeeded`에서 `period.end`를 사용하므로 갱신 시에는 올바르게 처리되지만, 최초 가입 시 30일 제한이 걸린다.  
- 트라이얼(30일)이 끝나자마자 실제 청구가 발생하고 `invoice.payment_succeeded`가 뒤따라 오는 경우엔 자동 수정되지만, 타이밍에 따라 관리자가 일시적으로 만료 화면을 보게 된다.

**해결 방법**  
```ts
// checkout.session.completed에서 subscription의 current_period_end를 사용
const subscription = await stripe.subscriptions.retrieve(session.subscription)
const expiresAt = new Date(subscription.current_period_end * 1000).toISOString()
```

---

### [10위] Stripe 이중 트라이얼 — `app/api/billing/create-session/route.ts:38`

**문제 설명**  
가입 시 3개월 트라이얼을 이미 설정했음에도, Stripe checkout에서 `trial_period_days: 90`을 추가한다.

**심각도**: Low

**근거**  
- 사용자가 3개월 무료 체험 후 결제로 전환하면, Stripe에서 다시 90일 트라이얼이 시작된다.  
- 결제 없이 최대 6개월 무료 사용 가능.  
- 의도하지 않은 경우 수익 손실.

**해결 방법**  
`trial_period_days: 90` 제거하거나 `hotels.plan_expires_at`을 기반으로 남은 일수를 계산해 전달.

---

## 2. 보안 감사

---

### B-01: 슈퍼어드민 Rate Limiting 없음

**심각도**: High

**근거**  
`/api/super-admin/auth`는 비밀번호 브루트포스에 무방비다. 슈퍼어드민 비밀번호가 단순하면 공격 성공 시 전체 호텔 데이터 열람·라이선스 발급 권한이 탈취된다.

**실제 공격 시나리오**  
```bash
# 공격자가 일반 비밀번호 목록으로 자동화 요청
for password in $(cat top10k_passwords.txt); do
  curl -X POST /api/super-admin/auth -d '{"password":"'$password'"}'
done
```

**해결 방법**  
IP당 5회/분 Rate Limiting. 실패 시 지수 백오프(1초→2초→4초).

---

### B-02: 게스트 코드 브루트포스

**심각도**: Medium

**근거**  
6자리 숫자 코드(000000~999999)는 100만 가지다. `/api/auth/guest`에 Rate Limiting이 없다. 게스트 코드 유효 시간(당일, 약 15~24시간) 동안 자동화로 전수 탐색 가능.

**실제 공격 시나리오**  
1. 관리자가 `/guest?h={hotelId}` URL을 게시하면 hotelId 노출.  
2. 공격자가 해당 hotelId로 000000~999999 자동 요청.  
3. 응답 200이 나오면 게스트 세션 획득 → 객실 상태 변경 가능.

**해결 방법**  
동일 IP에서 10회/분 초과 시 429. 또는 코드를 8~10자리로 늘리거나 alphanumeric 코드 사용.

---

### B-03: 게스트 코드 존재 여부 노출

**심각도**: Low

**근거**  
`/api/auth/guest`가 만료된 코드(`expired_code`)와 틀린 코드(`invalid_code`)를 다른 에러 코드로 구분해 반환한다. 공격자가 유효한 코드를 찾은 뒤 만료를 기다렸다가 재사용 시도 여부를 판단하는 데 활용될 수 있다. (현재 구조상 실질적 피해는 낮음)

---

### B-04: 푸시 구독 DELETE 미인증

**심각도**: Low

**근거**  
`DELETE /api/push/subscribe`는 endpoint URL만 있으면 인증 없이 누구나 구독 삭제 가능. Push notification endpoint URL은 브라우저 개발자 도구에서 노출될 수 있다.

**해결 방법**  
삭제 시에도 `roomly_worker_session` 또는 관리자 세션 검증 후 "내 구독만" 삭제 가능하도록 제한.

---

### B-05: CSRF 보호 없음

**심각도**: Medium

**근거**  
Next.js App Router는 서버 액션에 자동 CSRF 보호를 제공하지만, 이 프로젝트는 커스텀 API Route를 사용한다. `sameSite: 'lax'` 쿠키 설정이 기본 보호를 제공하지만, 같은 도메인(Vercel 프리뷰 URL 패턴)에서의 요청은 허용될 수 있다.

**현재 상태**: `sameSite: 'lax'`로 대부분의 CSRF는 차단됨. 추가적으로 `Origin` 헤더 검증 권장.

---

### B-06: JWT Secret 단일화

**심각도**: Medium

**근거**  
관리자(Supabase 자동 발급)·직원·게스트 JWT가 모두 동일한 `JWT_SECRET`으로 서명된다. 직원 JWT를 탈취해 `role: 'admin'`으로 재조합해도 서명은 유효하다. 단, 관리자 인증은 Supabase Auth의 `getUser()`로 검증해 서버측 세션을 확인하므로 실제로는 재조합 공격이 통하지 않는다. (JWT Secret 자체가 유출되지 않는 한)

**위험**: JWT_SECRET 유출 시 모든 역할을 위조 가능.

---

## 3. 성능 감사

---

### P-01: 미들웨어 Supabase 호출

앞서 코드 품질 [7위]에서 기술. 모든 `/admin` 요청에 추가 RTT 발생.

---

### P-02: Realtime 채널 누수 가능성

**심각도**: Medium

**근거**  
`DirtyDashboard.tsx`와 `WorkerDashboard.tsx`에서 `supabase.removeChannel(channel)` cleanup이 있다. 그러나 `createClientWithToken()` 함수가 매번 새 Supabase 클라이언트를 생성한다면, 언마운트 전에 컴포넌트가 재렌더링될 경우 이전 채널이 누수될 수 있다.

---

### P-03: 크론 직렬 처리

일일 리포트 크론이 N개 호텔을 직렬 처리 (코드 품질 [8위] 참조). 체크인 알림 크론(`checkin-alert/route.ts`)도 `for (const room of toAlert)` 루프 안에서 push 발송을 직렬 처리한다. 100개 방이 동시에 알림 대상이면 순차 실행.

---

### P-04: `listUsers()` 스케일 한계 (signup)

코드 품질 [1위]와 동일. 반복 기술 생략.

---

### P-05: 슈퍼어드민 hotels 조회 방식

`app/api/super-admin/hotels/route.ts`가 rooms 전체를 SELECT 후 애플리케이션에서 그룹화한다. 호텔·객실 수가 늘수록 메모리 사용량과 응답 시간이 선형 증가.

**해결 방법**  
```sql
SELECT hotel_id, COUNT(*) as room_count 
FROM rooms WHERE deleted_at IS NULL 
GROUP BY hotel_id
```

---

### 사용자 수 증가에 따른 예측

| 호텔 수 | 예상 문제 |
|---------|-----------|
| ~50 | 현재 구조 유지 가능 |
| 50~200 | 일일 리포트 크론 타임아웃 위험. `listUsers()` 한계 도달 |
| 200+ | `listUsers()` 완전 신뢰 불가. 미들웨어 Supabase 호출로 p99 지연 급등. Supabase free-tier Realtime 연결 수 초과 |

---

## 4. 아키텍처 리뷰

---

### A-01: JWT 라이브러리 혼용

**심각도**: Low

**근거**  
`middleware.ts`는 `jose`(Edge 호환)를 사용하고, API Route들은 `jsonwebtoken`(Node.js 전용)을 사용한다. 현재 Vercel Functions는 Node.js 런타임이라 문제없지만, 미들웨어를 Edge로 전환하거나 다른 환경으로 이전 시 API Route들의 `jsonwebtoken`이 동작하지 않는다.

**해결 방법**: `jose`로 통일.

---

### A-02: service_role 클라이언트 모듈 레벨 생성

**심각도**: Medium

**근거**  
`app/api/super-admin/hotels/route.ts`와 `license/route.ts`에서 Supabase 클라이언트를 모듈 최상위(`const supabaseAdmin = createClient(...)`)에 생성한다. Next.js App Router 환경에서 이는 서버 빌드 시 한 번만 생성되어 모든 요청에서 공유된다. 환경변수가 런타임에 주입되는 경우(Vercel 환경 변수 변경 후 재배포 없이 적용 시) 문제가 될 수 있다.

**해결 방법**: 함수 내부에서 클라이언트 생성.

---

### A-03: 테스트 부재

**심각도**: High

**근거**  
단위 테스트, 통합 테스트, E2E 테스트 모두 없다. 현재 구조에서 가장 위험한 미테스트 영역:

| 경로 | 위험도 | 이유 |
|------|--------|------|
| `api/auth/qr` | 최고 | 직원 인증 진입점. 버그 시 직원 전체 접속 불가 |
| `api/admin/assign` | 높음 | 재배정 atomic 처리. Race condition 테스트 없음 |
| `api/billing/webhook` | 높음 | Stripe 이벤트 처리. 결제 후 만료일 저장 버그 시 모든 고객 차단 |
| `middleware.ts` | 높음 | 인증 게이트키퍼. 잘못된 리다이렉트 시 서비스 전체 차단 |
| `api/auth/signup` | 높음 | 호텔 생성 후 계정 생성 실패 시 부분 데이터 정리 미검증 |

---

### A-04: 폴더 구조 — 현재 유지 가능

Next.js 14 App Router 컨벤션을 잘 따르고 있다. 라우트별 역할 분리(admin/worker/guest)가 명확하다. 현재 규모에서 구조 변경 불필요.

---

## 5. 데이터베이스 리뷰

---

### D-01: staff 테이블 role 컬럼 마이그레이션 필요

**심각도**: High

**근거**  
코드(`app/api/admin/staff/route.ts:20`)는 `role` 컬럼을 INSERT하지만, 기존 `Roomly_DB스키마.md`에 작성된 원래 DDL에는 해당 컬럼이 없었다. 기존 운영 DB에 컬럼이 없다면 직원 추가 API 전체가 500으로 실패한다.

**해결 방법**  
```sql
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'housekeeping'
  CHECK (role IN ('housekeeping', 'dirty'));
```

---

### D-02: hotels 테이블 컬럼과 스키마 문서 불일치

**심각도**: Medium

**근거**  
`signup/route.ts`가 `plan_type`, `room_limit` 컬럼에 INSERT하는데, `Roomly_DB스키마.md`에 이 컬럼들이 정의되어 있지 않다. 문서 또는 실제 DB 중 하나가 잘못된 상태다.

---

### D-03: room_logs.changed_by 타입 혼용

**심각도**: Low

**근거**  
`changed_by TEXT`에 다음 값들이 혼재한다: UUID 문자열(직원), `'guest'` 문자열, `'admin'` 문자열, `'system'` 문자열. 조회·집계 시 타입 구분이 어렵다. 향후 "누가 변경했는지" 통계가 필요하면 분리가 어렵다.

---

### D-04: push_subscriptions auth 컬럼명 혼용

**심각도**: Low

**근거**  
`Roomly_DB스키마.md`의 DDL에는 `auth_key TEXT`로 정의되어 있지만, `app/api/push/subscribe/route.ts:38`에서 `auth: subscription.keys.auth`로 INSERT한다. 컬럼명이 `auth`와 `auth_key` 중 하나로 통일되어야 한다.

---

## 6. DevOps 리뷰

---

### DV-01: 로깅 인프라 없음

**심각도**: High

**근거**  
`console.error`가 `app/api/admin/rooms/route.ts`에 1곳만 존재한다. 나머지 에러는 조용히 실패(`catch {}`)하거나 클라이언트에 5xx만 반환한다. Vercel 대시보드 함수 로그는 최대 1시간 보존으로 사후 디버깅 불가.

**운영자가 새벽에 깨게 될 시나리오**  
체크인 2시간 전 알림 크론이 Supabase 연결 실패로 조용히 종료 → 알림 미발송 → 체크인 시간 초과 → 고객 컴플레인 → 운영자 확인 → 로그 없음 → 원인 불명.

**해결 방법**: Sentry 또는 Vercel Log Drains 연결.

---

### DV-02: 크론 시크릿 없는 로컬 테스트 위험

**심각도**: Low

**근거**  
`CRON_SECRET` 미설정 시 `authHeader !== 'Bearer undefined'`가 되어 인증이 통과될 수 있다. (`Bearer undefined` !== `Bearer ${undefined}` = `Bearer undefined` — 실제로는 둘 다 `Bearer undefined`이므로 일치해 버린다.)

**실제 확인**: `'Bearer ' + undefined` = `'Bearer undefined'`. `authHeader !== 'Bearer undefined'`이면 undefined 환경변수 상태에서 누구나 크론 API 호출 가능.

**해결 방법**  
```ts
if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}
```

---

### DV-03: 롤백 전략 없음

**심각도**: Medium

**근거**  
Vercel은 이전 배포로 즉시 롤백이 가능하지만, DB 스키마 변경(컬럼 추가 등)이 함께 배포될 경우 코드 롤백만으로는 되돌릴 수 없다. 마이그레이션 스크립트가 별도 관리되지 않아 "어느 배포에 어떤 스키마 변경이 있었는지" 추적 불가.

**해결 방법**: Supabase 마이그레이션 CLI(`supabase migration`) 도입. `scripts/setup-db.js` 파일이 있으나 버전 관리 방식이 확인되지 않음.

---

### DV-04: 백업 전략 문서 없음

**심각도**: Medium

**근거**  
Supabase free/pro tier는 자동 백업을 제공하지만, 복구 절차·RTO·RPO가 정의되어 있지 않다. 실수로 호텔 데이터를 `deleted_at` 대신 물리 삭제하면 이력이 사라진다.

---

## 7. 테스트 리뷰

테스트 파일 0개. 가장 위험한 미테스트 영역 (A-03 참조).

추가로:

| 시나리오 | 미테스트 위험 |
|----------|------------|
| QR 재발급 후 구 QR 접속 | qr_version 불일치 검증 로직 회귀 위험 |
| 게스트 코드 자정 만료 | 타임존 KST/UTC 변환 버그 |
| 직원 삭제 시 배정 일괄 취소 | force=true 경로 미테스트 |
| Stripe 웹훅 이벤트 순서 | payment_succeeded가 completed보다 먼저 도달 시 |
| Supabase Realtime 재연결 | 연결 끊김 후 미반영 상태 누락 |

---

## 최종 판정

**수정 후 출시**

**근거**  
인증 로직 자체는 견고하다(HttpOnly JWT, Supabase Auth, qr_version 검증). 그러나 다음 두 가지는 출시 전 반드시 수정해야 한다:

1. **직원/게스트 상태 변경 시 배정 소유권 미확인** (B-03, B-04) — 의도하지 않은 방 상태 변경이 현장 혼란을 야기한다.  
2. **staff 테이블 role 컬럼 마이그레이션** (D-01) — 배포 즉시 직원 추가 API 500 발생.

나머지는 운영 중 순차 수정 가능.

---

## 향후 30일 내 반드시 해결해야 할 기술적 문제 TOP 10

| 순위 | 문제 | 파일 | 예상 작업 시간 |
|------|------|------|--------------|
| 1 | staff.role 컬럼 마이그레이션 누락 | Supabase SQL | 10분 |
| 2 | 직원 상태 변경 시 배정 소유권 미확인 | `api/worker/status/route.ts` | 1시간 |
| 3 | 게스트 상태 변경 시 배정 소유권 미확인 | `api/guest/status/route.ts` | 1시간 |
| 4 | 이메일 중복 체크 `listUsers()` 제거 | `api/auth/signup/route.ts` | 2시간 |
| 5 | worker/guest status 미검증 | `api/worker/status`, `api/guest/status` | 30분 |
| 6 | Dirty Worker 상태 전환 조건 누락 | `api/worker/dirty/status/route.ts` | 30분 |
| 7 | 슈퍼어드민 Rate Limiting | `middleware.ts` 또는 `upstash/ratelimit` | 3시간 |
| 8 | CRON_SECRET undefined 허용 버그 | `api/cron/*/route.ts` | 30분 |
| 9 | 로깅 인프라 (Sentry 최소 연결) | `sentry.server.config.ts` 신규 | 2시간 |
| 10 | 일일 리포트 크론 N+1 쿼리 개선 | `api/cron/daily-report/route.ts` | 3시간 |

---

## 기존 docs와의 중복 여부

이 문서를 작성하면서 기존 docs와 중복을 최소화했다. 아래를 참고:

| 항목 | 이 문서 | 기존 docs |
|------|---------|-----------|
| RLS 정책 상세 | 언급만 | `Roomly_RLS정책.md` |
| 에러 케이스 정의 | 언급만 | `Roomly_에러케이스.md` |
| API 스펙 | 언급만 | `Roomly_API라우트.md` |
| DB DDL | 마이그레이션 누락만 지적 | `Roomly_DB스키마.md` |
| 구현 태스크 | 별도 (감사 결과 기반) | `Roomly_구현태스크.md`와 독립 |

이 문서에서 새로 다루는 내용: 구체적 코드 버그·보안 취약점·공격 시나리오·성능 예측·테스트 위험 영역.
