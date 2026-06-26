# Roomly API 라우트

> Next.js 14 App Router 기준. 경로: `app/api/...`  
> Supabase 클라이언트로 직접 처리 가능한 조회·수정은 API 라우트 없이 클라이언트에서 처리.  
> API 라우트는 커스텀 JWT 발급, service_role 필요 작업, 푸시 알림 발송에만 사용.

---

## 세션 방식 구분

| 역할 | 세션 처리 방식 |
|------|---------------|
| 관리자 | Supabase Auth (`@supabase/ssr` 패키지). `supabase.auth.getUser()`로 검증. 쿠키명: `sb-<project>-auth-token` |
| 고정 직원 | 커스텀 HttpOnly 쿠키 (`roomly_worker_session`). 값: 커스텀 JWT. 미들웨어에서 직접 파싱·검증. **maxAge: 30일** (QR JWT 만료와 동일) |
| 게스트 | 커스텀 HttpOnly 쿠키 (`roomly_guest_session`). 값: 커스텀 JWT. 만료 = 당일 자정 |

### roomly_worker_session 쿠키 만료 정책

```
발급: QR 스캔(/api/auth/qr) 성공 시
maxAge: 2,592,000초 (30일) — QR JWT 유효기간과 동일하게 설정
만료 시: 미들웨어가 /login?error=session_expired 리다이렉트
재발급: QR 재스캔 시 새 쿠키 발급 (기존 쿠키 덮어쓰기)
```

> **⚠️ 중요**: maxAge를 명시하지 않으면 session cookie가 되어 브라우저 종료 시 만료됨.
> 모바일 PWA에서 백그라운드 프로세스로 브라우저가 살아있으면 영구 세션처럼 작동하다가
> 앱 재시작 시 갑자기 로그아웃되는 현상 발생. 반드시 maxAge 명시.

---

## middleware.ts 보호 규칙

```
/admin/*              → Supabase Auth 세션 없으면 /login 리다이렉트
/worker/[id]          → roomly_worker_session 없거나 JWT의 staff_id ≠ URL [id] → /login 리다이렉트
/worker/dirty/[id]    → roomly_worker_session 없거나 worker_role ≠ 'dirty' → /login 리다이렉트
/worker/guest         → roomly_guest_session 없거나 만료 → /guest 리다이렉트
/api/admin/*          → Supabase Auth 세션 없으면 401
/api/worker/*         → roomly_worker_session 없으면 401
/api/guest/*          → roomly_guest_session 없으면 401
```

---

## 인증 — `/api/auth` / `/auth`

| 메서드 | 경로 | 설명 | 인증 | 키 |
|--------|------|------|------|----|
| GET | `/api/auth/qr` | QR URL의 JWT 토큰 검증 → 세션 쿠키 발급 | 없음 | service_role |
| POST | `/api/auth/guest` | 6자리 코드 검증 → 게스트 JWT 발급 + 세션 쿠키 | 없음 | service_role |
| POST | `/api/auth/logout` | 세션 종료 후 /login 리다이렉트 | 세션 쿠키 | — |
| GET | `/auth/callback` | Supabase OAuth/이메일 콜백 처리 | Supabase 코드 | — |

### POST `/api/auth/logout`

```
Process  역할에 따라 처리 분기:
         [관리자]
           1. supabase.auth.signOut() 호출 — Supabase 서버 세션 무효화
           2. Supabase Auth 쿠키 삭제 (@supabase/ssr가 자동 처리)
         [직원]
           1. roomly_worker_session 쿠키 삭제
         [게스트]
           1. roomly_guest_session 쿠키 삭제
         공통: 302 리다이렉트 → /login
Response 302 Location: /login
```

> 관리자는 쿠키 삭제만으로는 부족함. `supabase.auth.signOut()`을 반드시 호출해야  
> Supabase 서버의 refresh_token이 무효화됨.

### GET `/api/auth/qr`

```
Request  ?token=JWT                  -- QR URL의 ?token= 파라미터
Process  1. JWT 서명 검증 (JWT_SECRET)
         2. staff.qr_version 조회 → JWT의 qr_version 클레임과 비교
         3. 불일치 → /login?error=qr_expired 리다이렉트
         4. 일치하면 HttpOnly 세션 쿠키 저장 (roomly_worker_session)
         5. worker_role 확인:
            - 'dirty'        → /worker/dirty/{staffId} 리다이렉트
            - 'housekeeping' → /worker/{staffId} 리다이렉트
Response 302 리다이렉트 (성공 또는 실패 모두)
```

### GET `/auth/callback`

```
Process  1. ?code 파라미터로 Supabase 세션 교환 (exchangeCodeForSession)
         2. ?type=recovery → /reset-password 리다이렉트
         3. 기타 → /login?verified=1 리다이렉트
Response 302 리다이렉트
```

> 비밀번호 재설정 이메일 링크가 이 경로를 경유함.  
> Supabase Dashboard에서 Site URL과 redirect URL 허용 목록에 `/auth/callback` 등록 필요.

### POST `/api/auth/guest`

```
Request  { hotelId: string, code: string }
         hotelId: /guest?h={hotelId} URL 파라미터에서 추출해 클라이언트가 포함
Process  1. hotelId 형식 검증 (UUID 형식 아니면 400)
         2. guest_codes 테이블에서 hotel_id = hotelId AND code = code AND expires_at > now() 조회 (service_role)
            → hotel_id 없이 code만 조회하면 다른 호텔의 동일 코드와 충돌 가능 — 반드시 hotel_id 함께 조회
         3. 유효하면 게스트 JWT 발급 (sub: 임시 UUID, app_metadata: { hotel_id, role: "guest" })
         4. HttpOnly 세션 쿠키 저장 (role: guest, hotelId, expires: 당일 자정)
Response 200 { ok: true }
         400 { error: "invalid_request" }   -- hotelId 누락 또는 UUID 형식 아님
         401 { error: "invalid_code" | "expired_code" }
```

---

## 직원 관리 — `/api/admin/staff`

> service_role 필요 (staff 테이블 직접 INSERT·DELETE — auth_id는 서버가 생성한 UUID, Supabase Auth 계정 아님)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/admin/staff` | 직원 추가 (auth_id 생성 + QR JWT URL 반환) | 관리자 세션 |
| GET | `/api/admin/staff/[id]/qr` | 현재 QR URL 조회 (버전 변경 없음) | 관리자 세션 |
| POST | `/api/admin/staff/[id]/qr` | QR 재발급 (qr_version+1 후 새 JWT URL 반환) | 관리자 세션 |
| DELETE | `/api/admin/staff/[id]` | 직원 삭제 (미완료 배정 취소 + auth 삭제) | 관리자 세션 |

### POST `/api/admin/staff`

```
Request  { name: string, phone_number?: string, role?: 'housekeeping' | 'dirty' }
         role 기본값: 'housekeeping'
Process  1. UUID 생성 → auth_id로 사용
         2. staff 테이블에 INSERT (role 포함, service_role)
         3. 커스텀 JWT 발급 (30일 만료)
            - sub: auth_id
            - app_metadata: { hotel_id, role: "worker", worker_role: role, staff_id, qr_version: 1 }
         4. QR URL 생성: NEXT_PUBLIC_APP_URL/api/auth/qr?token=JWT
Response 200 { staffId, qrUrl }
```

### GET `/api/admin/staff/[id]/qr`

```
Process  1. staff 테이블에서 현재 qr_version + role 조회
         2. 현재 버전으로 JWT 재생성 (qr_version 변경 없음)
         3. QR URL 반환
Response 200 { qrUrl }
```

### POST `/api/admin/staff/[id]/qr`

```
Process  1. staff.qr_version += 1 업데이트
         2. 새 JWT 발급 (qr_version + worker_role 포함)
         3. 새 QR URL 반환 (구 QR은 qr_version 불일치로 자동 무효화)
Response 200 { qrUrl }
```

### DELETE `/api/admin/staff/[id]`

```
Query    ?force=true  (선택. 확인 다이얼로그 후 재요청 시 포함)

Process  [force=false 또는 미포함]
           미완료 배정(completed_at IS NULL AND cancelled_at IS NULL) 건수 조회
           → 0건이면 바로 삭제 진행
           → 1건 이상이면 409 반환 (클라이언트에서 확인 다이얼로그 표시)

         [force=true]
           미완료 assignments.cancelled_at 일괄 기록 후 staff row 삭제
         (auth.users row 없음 — 직원은 Supabase Auth 계정 미사용)

Response 200 { ok: true }
         409 { error: "has_active_assignments", count: N }
             → 클라이언트: "미완료 배정이 N건 있습니다. 그래도 삭제하시겠습니까?"
             → 확인 시 DELETE /api/admin/staff/[id]?force=true 재요청
```

---

## 객실 배정 — `/api/admin/assign`

> 재배정의 atomic 처리(취소 + 신규 생성)와 배정 후 푸시 알림 발송이 필요해 서버에서 처리

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/admin/assign` | 객실 배정 또는 재배정 | 관리자 세션 |

### POST `/api/admin/assign`

```
Request  { roomId: string, staffId?: string, isGuest?: boolean }
         staffId 없고 isGuest=true이면 게스트 풀 배정
Process  1. roomId가 자기 호텔 소속인지 확인 (hotel_id 검증)
         2. 해당 방의 활성 배정(completed_at IS NULL AND cancelled_at IS NULL) 조회
         3. 기존 배정 있으면 → cancelled_at 기록 (재배정 처리)
         4. 새 assignments row INSERT
         5. staffId 있으면 → /api/push/send 내부 호출로 해당 직원에게 푸시 알림 발송
            메시지: "[{roomNumber}호] 배정되었습니다. 체크인: {checkin_time}"
Response 200 { assignmentId }
         400 { error: "invalid_request" }   -- staffId도 isGuest도 없는 경우
         403 { error: "forbidden" }         -- 다른 호텔 객실 배정 시도
```

---

## 게스트 코드 발급 — `/api/admin/guest-code`

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/admin/guest-code` | 오늘의 게스트 코드 발급 (기존 코드 덮어쓰기) | 관리자 세션 |

```
Process  1. 6자리 랜덤 숫자 코드 생성
         2. guest_codes UPSERT ON CONFLICT (hotel_id, date) DO UPDATE SET code = EXCLUDED.code
            date = 오늘 날짜 (KST), expires_at = 당일 자정 (UTC+9 → UTC 변환: 당일 15:00Z)
Response 200 { code: "123456", expiresAt: "2026-06-16T15:00:00Z" }
```

---

## Dirty Worker — `/api/worker/dirty`

> `roomly_worker_session` 쿠키가 필요하며 JWT의 `worker_role`이 `'dirty'`인 경우만 허용.

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/worker/dirty/rooms` | 호텔 전체 활성 객실 목록 조회 | 직원 세션 (dirty role) |
| POST | `/api/worker/dirty/status` | 객실 상태를 dirty로 변경 | 직원 세션 (dirty role) |

### GET `/api/worker/dirty/rooms`

```
Process  1. roomly_worker_session 쿠키 JWT 검증
         2. worker_role ≠ 'dirty' → 403
         3. hotel_id 추출 → rooms 테이블 전체 조회 (deleted_at IS NULL)
         4. 층·호수 순 정렬 반환
Response 200 Room[]  -- { id, number, floor, type, status }
         401 { error: "unauthorized" }
         403 { error: "forbidden" }
```

### POST `/api/worker/dirty/status`

```
Request  { roomId: string }
Process  1. roomly_worker_session 쿠키 JWT 검증
         2. worker_role ≠ 'dirty' → 403
         3. roomId가 자기 호텔 소속인지 확인
         4. rooms.status = 'dirty' 업데이트
         5. room_logs INSERT (changed_by: staffId, status: 'dirty')
Response 200 { ok: true }
         400 { error: "invalid_request" }   -- roomId 누락
         401 { error: "unauthorized" }
         403 { error: "forbidden" }         -- 다른 호텔 객실 또는 역할 불일치
```

---

## 결제 — `/api/billing`

> Stripe(글로벌 카드) + 토스페이먼츠(한국 법인카드·계좌이체) 듀얼 게이트웨이.
> 한국 법인 고객은 토스페이먼츠를 통해 세금계산서 발행 가능 → 전환율 15~25% 향상 예상.

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/billing/create-session` | Stripe 결제 세션 생성 | 관리자 세션 |
| POST | `/api/billing/webhook` | Stripe 웹훅 처리 | 없음 (Stripe 서명 검증) |
| POST | `/api/billing/toss/confirm` | 토스페이먼츠 결제 승인 | 관리자 세션 |
| POST | `/api/billing/toss/webhook` | 토스페이먼츠 웹훅 처리 | 없음 (토스 시크릿 검증) |

### POST `/api/billing/toss/confirm`

```
Request  { paymentKey: string, orderId: string, amount: number }
         (토스페이먼츠 결제창이 성공 후 /admin/billing/toss-success 로 리다이렉트 시 쿼리파라미터로 전달)

Process  1. 관리자 세션에서 hotelId 추출
         2. amount가 플랜 가격과 일치하는지 서버 사이드 검증
         3. 토스페이먼츠 승인 API 호출
            POST https://api.tosspayments.com/v1/payments/confirm
            { paymentKey, orderId, amount }
         4. 성공 시 hotels.subscription_plan + plan_expires_at 업데이트
         5. 세금계산서 발행: 사업자번호 있으면 자동 요청

Response 200 { ok: true, plan: string, expiresAt: string }
         400 { error: "amount_mismatch" }
         402 { error: "payment_failed", message: 토스 에러 메시지 }
```

### 환경변수 추가 (토스페이먼츠)

```bash
TOSS_SECRET_KEY=test_sk_...        # 토스페이먼츠 시크릿 키 (서버 전용)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...  # 토스페이먼츠 클라이언트 키
```

---

## 브라우저 푸시 알림 — `/api/push`

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/push/subscribe` | 푸시 구독 정보 저장 | 직원/관리자 세션 |
| DELETE | `/api/push/subscribe` | 푸시 구독 해제 | 직원/관리자 세션 |
| POST | `/api/push/send` | 푸시 알림 발송 (내부 호출용) | 관리자 세션 |

### POST `/api/push/subscribe`

```
Request  { endpoint: string, keys: { p256dh: string, auth: string } }
Process  push_subscriptions UPSERT (endpoint 기준)
Response 200 { ok: true }
```

### POST `/api/push/send`

```
Request  { staffId?: string, isAdmin?: boolean, title: string, body: string }
         staffId 있으면 해당 직원에게, isAdmin=true면 관리자에게 발송
Process  1. push_subscriptions 조회
         2. web-push 라이브러리로 발송 (VAPID 키 사용)
         3. 410 Gone 응답 받은 구독은 DB에서 자동 삭제
Response 200 { sent: N }
```

> 호출 시점:
> - 객실 배정 완료 시 → 해당 직원에게 발송 (배정 API 내부에서 호출)
> - 60초 폴링 긴급 감지 시 → 관리자에게 발송 (클라이언트에서 `/api/push/send` 호출)

---

## Supabase Realtime 구독

> Supabase Dashboard → Table Editor → 해당 테이블 → Enable Realtime **반드시 활성화** 필요.  
> 코드만 짜면 이벤트가 수신되지 않음.

### 활성화 대상 테이블

| 테이블 | 활성화 이유 |
|--------|-------------|
| `rooms` | 객실 상태 변경 실시간 반영 |
| `assignments` | 배정 목록 실시간 반영 |

### 화면별 구독 설정

```ts
// /admin 현황판 — rooms 전체 변경 구독 (자기 호텔만 RLS로 자동 필터)
supabase.channel('admin-rooms')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, handler)
  .subscribe()

// /worker/[staffId] — assignments 변경 구독 (본인 배정만 RLS로 자동 필터)
supabase.channel('worker-assignments')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, handler)
  .subscribe()

// /worker/guest — assignments 변경 구독 (is_guest=true만 RLS로 자동 필터)
supabase.channel('guest-assignments')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, handler)
  .subscribe()
```

> 컴포넌트 언마운트 시 반드시 `supabase.removeChannel(channel)` 호출해 구독 해제.

---

## 직원/게스트 상태 변경 API

> **⚠️ 설계 핵심**: 상태 변경은 반드시 서버 API로만 처리. 클라이언트 직접 Supabase 호출 금지.
> 이유: (1) 배정 소유권 확인 필요, (2) assignments.completed_at 원자적 업데이트 필요

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/worker/status` | 직원 배정 방 상태 변경 (rooms + assignments 원자적 처리) | 직원 세션 |
| POST | `/api/guest/status` | 게스트 풀 방 상태 변경 (rooms + assignments 원자적 처리) | 게스트 세션 |

### POST `/api/worker/status`

```
Request  { roomId: string, status: 'dirty' | 'cleaning' | 'done' | 'inspect', memo?: string }

Validation
  1. status가 VALID_STATUSES 중 하나인지 확인 → 아니면 400
  2. roomly_worker_session 쿠키 JWT 검증 → staffId, hotelId 추출
  3. roomId가 자기 호텔 소속인지 확인 (hotel_id 검증) → 아니면 403
  4. assignments 테이블에서 "나에게 배정된 활성 배정"인지 확인
     (staff_id = staffId AND completed_at IS NULL AND cancelled_at IS NULL)
     → 없으면 403 "배정된 방이 아닙니다"

Process  [status = 'done'인 경우 — atomic 처리 필수]
           BEGIN (Supabase RPC 또는 service_role으로 직접 처리)
           1. rooms.status = 'done' 업데이트
           2. assignments.completed_at = now() 업데이트 (같은 배정 row)
           3. room_logs INSERT (changed_by: staffId, status: 'done', memo)
           COMMIT

         [status = 'cleaning' | 'dirty' | 'inspect'인 경우]
           1. rooms.status 업데이트
           2. room_logs INSERT
           (assignments.completed_at 업데이트 불필요)

Response 200 { ok: true }
         400 { error: "invalid_status" }
         403 { error: "forbidden" }   -- 배정 소유권 미확인 또는 다른 호텔
         401 { error: "unauthorized" }
```

> **⚠️ 설계 원칙**: rooms.status='done' 업데이트와 assignments.completed_at 업데이트는
> 반드시 같은 DB 작업에서 처리해야 한다. 두 작업이 분리되면:
> - rooms.status='done'인데 completed_at=NULL인 불일치 상태 발생
> - 직원별 평균 처리 시간 통계 쿼리 전체가 오염됨
> Supabase RPC 함수 또는 service_role로 두 UPDATE를 연속 실행.

### POST `/api/guest/status`

```
Request  { roomId: string, status: 'dirty' | 'cleaning' | 'done' | 'inspect' }

Validation (worker와 동일하나 배정 소유권 조건 다름)
  4. assignments에서 is_guest=true AND completed_at IS NULL AND cancelled_at IS NULL AND room_id=roomId 확인
     → 없으면 403

Process  동일 (status='done' 시 completed_at 원자적 업데이트)
```

---

## 클라이언트 직접 처리 (API 라우트 없음)

아래 작업은 Supabase anon 키 + RLS로 클라이언트에서 직접 처리:

| 작업 | 방법 |
|------|------|
| 관리자 로그인 | `supabase.auth.signInWithPassword()` |
| 로그인 후 last_active_at 업데이트 | `supabase.from('hotels').update({ last_active_at: new Date() }).eq('id', hotelId)` — 로그인 성공 후 서버 컴포넌트에서 처리 |
| 비밀번호 재설정 이메일 요청 | `supabase.auth.resetPasswordForEmail()` |
| 비밀번호 변경 | `supabase.auth.updateUser({ password })` |
| 전체 객실 현황 조회 | `supabase.from('rooms').select()` |
| 객실 추가/수정 | `supabase.from('rooms').insert/update()` |
| 객실 삭제 | `supabase.from('rooms').update({ deleted_at: new Date().toISOString() })` — 물리 삭제 금지, 소프트 삭제로 처리 |
| 객실 조회 (전체) | `supabase.from('rooms').select().is('deleted_at', null)` — 반드시 deleted_at IS NULL 조건 포함 |
| 객실 배정 | `POST /api/admin/assign` (서버 처리 — 재배정 atomic 처리 + 푸시 알림 필요) |
| 직원 배정 목록 조회 | `supabase.from('assignments').select()` (RLS로 본인 배정만 반환) |
| 객실 상태 변경 (직원/게스트) | `POST /api/worker/status` 또는 `POST /api/guest/status` — **클라이언트 직접 Supabase 호출 금지** |
| room_logs INSERT | `supabase.from('room_logs').insert()` |
| 실시간 현황 구독 | `supabase.channel().on('postgres_changes', ...)` |
| 일일 통계 조회 | `supabase.from('assignments').select()` (날짜 필터, completed_at IS NOT NULL 조건 필수) |

---

## 에러 응답 형식 (공통)

```json
{ "error": "error_code", "message": "사람이 읽을 수 있는 설명" }
```

| HTTP | error_code | 의미 |
|------|------------|------|
| 400 | `invalid_request` | 필수 파라미터 누락 또는 형식 오류 |
| 401 | `unauthorized` | 세션 없음 또는 만료 |
| 403 | `forbidden` | 권한 없음 (다른 호텔, 다른 직원 등) |
| 409 | `conflict` | 비즈니스 규칙 충돌 (미완료 배정 있음 등) |
| 500 | `server_error` | 서버 내부 오류 |
