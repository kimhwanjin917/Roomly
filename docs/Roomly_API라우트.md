# Roomly API 라우트

> Next.js 14 App Router 기준. 경로: `app/api/...`  
> Supabase 클라이언트로 직접 처리 가능한 조회·수정은 API 라우트 없이 클라이언트에서 처리.  
> API 라우트는 커스텀 JWT 발급, service_role 필요 작업, 푸시 알림 발송에만 사용.

---

## 세션 방식 구분

| 역할 | 세션 처리 방식 |
|------|---------------|
| 관리자 | Supabase Auth (`@supabase/ssr` 패키지). `supabase.auth.getUser()`로 검증. 쿠키명: `sb-<project>-auth-token` |
| 고정 직원 | 커스텀 HttpOnly 쿠키 (`roomly_worker_session`). 값: 커스텀 JWT. 미들웨어에서 직접 파싱·검증 |
| 게스트 | 커스텀 HttpOnly 쿠키 (`roomly_guest_session`). 값: 커스텀 JWT. 만료 = 당일 자정 |

---

## middleware.ts 보호 규칙

```
/admin/*        → Supabase Auth 세션 없으면 /login 리다이렉트
/worker/[id]    → roomly_worker_session 없거나 JWT의 staff_id ≠ URL [id] → /login 리다이렉트
/worker/guest   → roomly_guest_session 없거나 만료 → /guest 리다이렉트
/api/admin/*    → Supabase Auth 세션 없으면 401
/api/worker/*   → roomly_worker_session 없으면 401
/api/guest/*    → roomly_guest_session 없으면 401
```

---

## 인증 — `/api/auth`

| 메서드 | 경로 | 설명 | 인증 | 키 |
|--------|------|------|------|----|
| POST | `/api/auth/qr` | QR URL의 JWT 토큰 검증 → 세션 쿠키 발급 | 없음 | service_role |
| POST | `/api/auth/guest` | 6자리 코드 검증 → 게스트 JWT 발급 + 세션 쿠키 | 없음 | service_role |
| POST | `/api/auth/logout` | 세션 종료 후 /login 리다이렉트 | 세션 쿠키 | — |

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

### POST `/api/auth/qr`

```
Request  { token: string }           -- QR URL의 ?token= 값
Process  1. JWT 서명 검증 (JWT_SECRET)
         2. staff.qr_version 조회 → JWT의 qr_version 클레임과 비교
         3. 일치하면 HttpOnly 세션 쿠키 저장 (staffId, hotelId, role)
Response 200 { staffId, hotelId }
         401 { error: "invalid_token" | "qr_expired" }
```

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
| GET | `/api/admin/staff/[id]/qr` | QR 재발급 (qr_version+1 후 새 JWT URL 반환) | 관리자 세션 |
| DELETE | `/api/admin/staff/[id]` | 직원 삭제 (미완료 배정 취소 + auth 삭제) | 관리자 세션 |

### POST `/api/admin/staff`

```
Request  { name: string, phone_number?: string }
Process  1. UUID 생성 → auth_id로 사용
         2. staff 테이블에 INSERT (service_role)
         3. 커스텀 JWT 발급
            - sub: auth_id
            - app_metadata: { hotel_id, role: "worker", staff_id, qr_version: 1 }
            - exp 클레임 없음 (무기한) — qr_version 불일치로만 무효화 제어
              (jsonwebtoken 발급 시 expiresIn 옵션 생략)
         4. QR URL 생성: NEXT_PUBLIC_APP_URL/worker/[staffId]?token=JWT
Response 200 { staffId, qrUrl }
```

### GET `/api/admin/staff/[id]/qr`

```
Process  1. staff.qr_version += 1 업데이트
         2. 새 JWT 발급 (qr_version 갱신 포함)
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

## 클라이언트 직접 처리 (API 라우트 없음)

아래 작업은 Supabase anon 키 + RLS로 클라이언트에서 직접 처리:

| 작업 | 방법 |
|------|------|
| 관리자 로그인 | `supabase.auth.signInWithPassword()` |
| 전체 객실 현황 조회 | `supabase.from('rooms').select()` |
| 객실 추가/수정 | `supabase.from('rooms').insert/update()` |
| 객실 삭제 | `supabase.from('rooms').update({ deleted_at: new Date().toISOString() })` — 물리 삭제 금지, 소프트 삭제로 처리 |
| 객실 조회 (전체) | `supabase.from('rooms').select().is('deleted_at', null)` — 반드시 deleted_at IS NULL 조건 포함 |
| 객실 배정 | `POST /api/admin/assign` (서버 처리 — 재배정 atomic 처리 + 푸시 알림 필요) |
| 직원 배정 목록 조회 | `supabase.from('assignments').select()` |
| 객실 상태 변경 (직원/게스트) | `supabase.from('rooms').update({ status })` |
| room_logs INSERT | `supabase.from('room_logs').insert()` |
| 실시간 현황 구독 | `supabase.channel().on('postgres_changes', ...)` |
| 일일 통계 조회 | `supabase.from('assignments').select()` (날짜 필터) |

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
