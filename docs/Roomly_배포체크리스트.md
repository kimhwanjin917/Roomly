# Roomly 프로덕션 배포 체크리스트 (T-095 / T-160 / T-163)

> 2026-07-07 작성. 코드 쪽 준비는 완료 — 아래 항목은 각 서비스 대시보드에서 직접 확인/설정해야 하는 운영 작업이다.
> 완료한 항목은 체크박스를 채우고, 전부 완료되면 노션 티켓 T-095 / T-160 / T-163을 Done으로 변경한다.

---

## 1. Vercel 프로덕션 배포 설정 (T-160)

### 프로젝트 설정
- [x] Vercel 프로젝트가 GitHub 저장소와 연결되어 있고 `main` 브랜치 → Production 배포로 설정 (2026-07-09 확인 — push 자동 배포 정상)
- [x] Node.js 버전 확인 (Settings → General) — 24.x (2026-07-09 확인)
- [ ] 프로덕션 도메인 연결 (현재 코드에 하드코딩된 URL: `https://roomly-plum-eight.vercel.app` — 커스텀 도메인 사용 시 `app/admin/settings/page.tsx`의 `WEBHOOK_URL`과 `NEXT_PUBLIC_APP_URL` 함께 변경)

### 환경 변수 (Settings → Environment Variables, Production)
`.env.local.example` 기준 전체 목록. **프로덕션 키**로 설정할 것:

| 변수 | 용도 | 주의 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 관리 작업 | 절대 클라이언트 노출 금지 |
| `JWT_SECRET` | 직원/게스트 세션 | Supabase JWT Secret과 동일하게 |
| `NEXT_PUBLIC_APP_URL` | 앱 URL | 프로덕션 도메인으로 |
| `NEXT_PUBLIC_CHECKIN_ALERT_MINUTES` | 체크인 알림 기준 | 기본 120 |
| `TOSS_PAYMENTS_CLIENT_KEY` | Toss 결제 | `live_ck_...` (테스트 키 아님!) |
| `TOSS_PAYMENTS_SECRET_KEY` | Toss 결제 | `live_sk_...` |
| `TOSS_PAYMENTS_WEBHOOK_SECRET` | Toss 웹훅 검증 | Toss 대시보드에서 발급 |
| `CRON_SECRET` | Vercel Cron 인증 | 랜덤 32자 이상 |
| `SUPER_ADMIN_EMAIL` | 결제 실패 알림 수신 | |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 웹 푸시 | `npx web-push generate-vapid-keys` |
| `RESEND_API_KEY` / `EMAIL_FROM` | 이메일 발송 | 도메인 인증 후 실제 발신 주소로 |
| `ANTHROPIC_API_KEY` | AI 기능 (AI-01~04) | 없으면 AI 기능만 비활성 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limit (T-070) | 없으면 인메모리 폴백 (멀티 인스턴스에서 부정확) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | 네이티브 앱 FCM 푸시 (T-205) | 없으면 네이티브 푸시만 비활성 — docs/Roomly_네이티브앱.md |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | 에러 추적 (T-170) | AUTH_TOKEN은 소스맵 업로드용 |

### Cron (vercel.json에 이미 정의됨 — 배포 후 동작 확인)
Vercel Cron은 `Authorization: Bearer $CRON_SECRET` 헤더를 자동으로 붙이지 **않는다**.
Vercel 대시보드 → Settings → Cron Jobs에서 각 잡이 등록됐는지 확인하고,
Vercel의 Cron 요청은 `CRON_SECRET` 환경 변수가 설정된 경우 자동으로 Authorization 헤더에 담아 보낸다 (Vercel 공식 동작).

| 경로 | 스케줄 (UTC) | KST | 역할 |
|---|---|---|---|
| `/api/cron/daily-report` | `0 23 * * *` | 08:00 | 일일 리포트 이메일 |
| `/api/cron/billing-charge` | `0 20 * * *` | 05:00 | 정기 결제 청구 |
| `/api/cron/trial-ending` | `0 0 * * *` | 09:00 | 무료체험 만료 D-3/D-1 알림 |
| `/api/cron/checkin-alert` | `0 22 * * *` | 07:00 | 체크인 긴급/초과 푸시 ⚠️ |
| `/api/cron/cleanup` | `0 16 * * *` | 01:00 | 만료 게스트 코드 정리 |

- [ ] 배포 후 각 크론 잡 최초 실행 로그 확인 (Vercel → Logs, 401이 나오면 CRON_SECRET 불일치)
  - 2026-07-11 확인: 5개 크론 라우트 모두 배포됨 + 무단 호출 401 정상 (인증 동작 확인). 실제 스케줄 실행 로그는 Hobby 로그 보존(1시간) 제한으로 원격 확인 불가 — 대시보드 Settings → Cron Jobs에서 최근 실행 확인 필요.

> ⚠️ **Hobby 플랜 제약**: 크론이 하루 1회로 제한되어 checkin-alert를 일 1회(07:00 KST)로 낮춰 배포함.
> 체크인 긴급/초과 알림을 원래 설계(10분 주기)로 돌리려면 둘 중 하나:
> 1. Vercel **Pro 플랜** 업그레이드 후 `vercel.json`을 `*/10 * * * *`로 복원
> 2. 외부 스케줄러(cron-job.org 등)에서 10분마다 `GET {도메인}/api/cron/checkin-alert`를
>    `Authorization: Bearer $CRON_SECRET` 헤더로 호출

### 배포 후 스모크 테스트
- [x] `/` 랜딩 페이지 로드 (2026-07-09 확인 — /login, /terms, /privacy, manifest.json도 200)
- [ ] 회원가입 → 온보딩 → 현황판 진입
- [ ] 직원 QR 로그인 → 상태 변경 → 관리자 현황판 실시간 반영 (Realtime)
- [ ] 언어 전환 (한/EN/VI) 동작
- [ ] 푸시 알림 구독 + 배정 시 수신
- [ ] Toss 결제 (라이브 카드로 소액 플랜 테스트 후 즉시 해지)
- [ ] Sentry에 테스트 에러 수신 확인

---

## 2. 외부 서비스 연동 완료 (T-095)

### Supabase
- [ ] 프로덕션 프로젝트에 `supabase/migrations/001~016` 전부 순서대로 실행 (016 = 네이티브 푸시 T-205)
  - ⚠️ 2026-07-11 확인: **001~015는 적용됨, 016만 미적용** (`push_subscriptions.platform`/`fcm_token` 컬럼 없음). 이 때문에 `/api/push/subscribe`가 웹 구독 저장에도 실패 중 — **푸시 신규 구독이 프로덕션에서 깨져 있음**. Supabase SQL Editor에서 `016_native_push.sql` 내용 실행하면 즉시 해결 (IF NOT EXISTS라 재실행 안전).
- [ ] `rls_audit.sql` 실행해 RLS 정책 검증 (T-161에서 정책 자체는 검증 완료)
- [x] Realtime 활성화: `rooms`, `assignments` + Phase 3 테이블 (`supply_requests`, `maintenance_requests`) — Database → Replication (2026-07-11 확인 — 4개 테이블 모두 postgres_changes 구독 성공)
- [ ] Auth 설정: Site URL = 프로덕션 도메인, Redirect URLs에 `/auth/callback` 추가
- [ ] Auth 이메일 템플릿 (비밀번호 재설정) 한글화 확인
- [ ] JWT Secret 값을 Vercel `JWT_SECRET`과 일치시킴

### Toss Payments
- [ ] 라이브 상점 심사 완료 + 라이브 API 키 발급
- [ ] 웹훅 URL 등록: `{도메인}/api/billing/webhook` (이벤트: 빌링 결제 관련)
- [ ] 웹훅 시크릿을 Vercel `TOSS_PAYMENTS_WEBHOOK_SECRET`에 설정
- [ ] 정기결제(빌링) 사용 승인 여부 확인 (Toss는 빌링 사용에 별도 계약 필요)

### Resend
- [ ] 발신 도메인 등록 + DNS(SPF/DKIM) 인증
- [ ] `EMAIL_FROM`을 인증된 도메인 주소로 변경
- [ ] 일일 리포트/환영 이메일 실발송 테스트

### Upstash Redis
- [ ] 프로덕션 DB 생성 (리전: Vercel 함수 리전과 가까운 곳)
- [ ] REST URL/TOKEN을 Vercel 환경 변수에 설정

### Sentry
- [ ] 프로덕션 프로젝트 생성, DSN을 Vercel에 설정 (2026-07-11 확인: 클라이언트 번들에 DSN 없음 → `NEXT_PUBLIC_SENTRY_DSN` 미설정 상태)
- [ ] `SENTRY_AUTH_TOKEN` 설정 (소스맵 업로드)
- [ ] 알림 규칙: 신규 이슈 발생 시 이메일/슬랙

### 웹 푸시 (VAPID)
- [ ] 프로덕션용 VAPID 키 쌍 생성 (`npx web-push generate-vapid-keys`)
- [ ] ⚠️ 키를 바꾸면 기존 구독이 전부 무효화되므로 배포 전에 한 번만 생성

### Anthropic (AI 기능)
- [ ] 프로덕션 API 키 발급 + 사용량 한도(spend limit) 설정

---

## 3. Supabase 데이터 백업 정책 (T-163)

### 권장 정책
| 항목 | 정책 |
|---|---|
| 자동 백업 | Supabase **Pro 플랜** 활성화 → 일일 자동 백업 (7일 보관) |
| PITR | 결제 데이터가 쌓이기 시작하면 Point-in-Time Recovery 애드온 검토 (분 단위 복구) |
| 보조 백업 | 주 1회 `pg_dump` 오프사이트 백업 (아래 스크립트) |
| 복구 목표 | RPO 24시간 (일일 백업 기준), RTO 1시간 |

### 체크리스트
- [ ] Supabase 프로젝트를 Pro 플랜으로 업그레이드 (Free 플랜은 자동 백업 없음)
- [ ] Database → Backups에서 일일 백업 활성 상태 확인
- [x] 보조 백업: GitHub Actions 주간 `pg_dump` 워크플로 추가 — `.github/workflows/db-backup.yml` (2026-07-09)
  - [ ] repo secret `SUPABASE_DB_URL` 등록 후 workflow_dispatch로 1회 수동 실행해 확인
- [ ] 분기 1회 복구 리허설: 백업에서 스테이징 프로젝트로 복원해 로그인·현황판 확인

### 보조 pg_dump 백업 (선택)
```bash
# Supabase → Settings → Database → Connection string (Direct) 사용
pg_dump "$SUPABASE_DB_URL" \
  --no-owner --no-privileges \
  --exclude-schema 'auth|storage|realtime|supabase_*' \
  -Fc -f roomly_$(date +%Y%m%d).dump
```
- GitHub Actions에서 돌릴 경우 `SUPABASE_DB_URL`을 repo secret으로 등록하고
  결과물을 프라이빗 스토리지(S3/GCS/Vercel Blob 등)에 업로드한다. **레포에 커밋 금지.**
- 복원: `pg_restore --no-owner -d "$TARGET_DB_URL" roomly_YYYYMMDD.dump`

### 백업 대상 우선순위
1. `hotels`, `payment_logs` — 결제/계약 (법적 보존 의무)
2. `rooms`, `staff`, `assignments`, `room_logs` — 운영 데이터
3. `supplies`, `supply_requests`, `maintenance_requests` — 부가 데이터
4. `push_subscriptions`, `guest_codes` — 소실돼도 재생성 가능 (복구 불필요)
