import json, urllib.request, urllib.error, time

TOKEN = 'ntn_h40993625448BPM2GRFXYnGK6zF0dOnhv8QMfHdMOA18J0'

def rt(text):
    """rich_text blocks, split at 2000 chars"""
    chunks = []
    while text:
        chunks.append({"type": "text", "text": {"content": text[:2000]}})
        text = text[2000:]
    return chunks

def patch(page_id, name=None, desc=None):
    props = {}
    if name:
        props['Name'] = {'title': rt(name)}
    if desc is not None:
        props['Description'] = {'rich_text': rt(desc)}
    data = json.dumps({'properties': props}).encode('utf-8')
    req = urllib.request.Request(
        f'https://api.notion.com/v1/pages/{page_id}',
        data=data, method='PATCH',
        headers={
            'Authorization': f'Bearer {TOKEN}',
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
        }
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f'  ERROR {e.code}: {body[:200]}')
        return e.code

FIXES = [
    # (page_id, ticket_id, new_name_or_None, new_desc_or_None)
    (
        '3870f457-4ef0-8108-86fa-c52eb3381635', 'T-011', None,
        'app/api/push/subscribe/route.ts 구현 완료 (POST/DELETE, JWT 검증, DB UPSERT)'
    ),
    (
        '3870f457-4ef0-81a1-b415-d68d88399099', 'T-012', None,
        'app/worker/[staffId]/WorkerDashboard.tsx에 벨 버튼 추가.\n'
        'PushState: idle/subscribed/denied/unsupported 상태 관리\n'
        'subscribePush(): Notification.requestPermission + pushManager.subscribe + POST /api/push/subscribe\n'
        'unsubscribePush(): DELETE /api/push/subscribe + sub.unsubscribe()\n'
        '각 상태별 벨 아이콘 색상 표시. denied 시 안내문 + title 표시'
    ),
    (
        '3870f457-4ef0-8180-9472-e960e82d1ed8', 'T-013', None,
        'FILE: app/api/admin/assign/route.ts (modify)\n\n'
        '[구현 위치]\n'
        'lib/push.ts의 sendPushToStaff(staffId, payload) 함수 활용\n'
        'assign/route.ts에서 sendPushToStaff 비차단 호출 방식 구현\n\n'
        '[구체적 수정]\n'
        'assign route.ts의 DB INSERT 완료 후:\n'
        'import { sendPushToStaff } from \'@/lib/push\'\n'
        'if (staffId) {\n'
        '  sendPushToStaff(staffId, {\n'
        '    title: \'방 배정\',\n'
        '    body: \'청소할 방이 배정되었습니다\',\n'
        '    url: \'/worker/\' + staffId,\n'
        '    tag: \'assign-\' + roomId,\n'
        '  }).catch(() => {})\n'
        '}\n'
        'tag에 \'assign-{roomId}\'를 써서 같은 방의 중복 알림 덮어쓰기 가능\n\n'
        '[예외처리]\n'
        '- VAPID 미설정이면 lib/push.ts의 vapidInitialized 플래그로 조용히 스킵\n'
        '- 배정 해제(unassign) 시에는 알림 없음\n\n'
        '완료 조건: 배정 후 약 5초 내에 직원 기기에 알림 수신'
    ),
    (
        '3870f457-4ef0-8172-ae88-e2774fa60467', 'T-014', None,
        'FILE: app/admin/AdminDashboard.tsx (modify), app/api/push/admin-alert/route.ts (new)\n\n'
        '[1. 관리자 벨 버튼 UI - AdminDashboard.tsx]\n'
        'WorkerDashboard와 동일한 PushState 관리 패턴\n'
        'PushState: idle/subscribed/denied/unsupported\n'
        'onMount: Notification.permission 확인 (자동 구독 X)\n'
        '구독 시: POST /api/push/subscribe body={subscription, hotelId, isAdmin:true}\n'
        '해제 시: DELETE /api/push/subscribe body={endpoint, isAdmin:true}\n'
        '위치: AdminNav 헤더 오른쪽 벨 버튼 형태로 추가\n\n'
        '[2. 주기적 체크 로직 - AdminDashboard.tsx]\n'
        'pushState===\'subscribed\' 일 때 60초 setInterval 실행\n'
        '매 60초: POST /api/push/admin-alert 호출\n'
        '컴포넌트 unmount 시 clearInterval\n\n'
        '[3. /api/push/admin-alert API]\n'
        'POST, 관리자 Supabase 세션 확인\n'
        'hotelId = user.app_metadata.hotel_id\n'
        '체크 대상 방: rooms WHERE hotel_id=hotelId AND checkin_time <= now()+{ALERT_MINUTES}min AND status NOT IN (done, inspect) AND deleted_at IS NULL\n'
        '중복 방지: room_logs에 alert_type=\'urgent_2h\'인 레코드 체크\n'
        '발송: sendPushToAdmin(hotelId, {title:\'긴급: {room.number}호\', body:\'체크인까지 {N}분 남았습니다\', url:\'/admin\', tag:\'urgent-\'+room.id})\n'
        '로그: INSERT room_logs(room_id, status=room.status, changed_by=\'system\', alert_type=\'urgent_2h\')\n'
        '응답: {sent: N}\n\n'
        '완료 조건: 체크인 2시간 전 미완료 방 존재 시 관리자 기기에 알림 수신'
    ),
    (
        '3870f457-4ef0-8147-af09-d516767c5572', 'T-023', None,
        'middleware.ts의 plan_expires_at + trial_ends_at 만료 여부 확인. '
        'rooms/page.tsx에서 ROOM_LIMITS 상수로 객실 한도 초과 시 room_limit 체크 경고'
    ),
    (
        '3890f457-4ef0-8158-8f8b-eaa76c016f39', 'T-024', None,
        'FILE: app/api/auth/signup/route.ts (완료), app/admin/AdminDashboard.tsx\n'
        '가입 후 plan_type=\'trial\', trial_ends_at=now()+14일로 자동 설정 (자동 완료).\n'
        '/admin 화면에 \'D-N일 무료체험 중\' 배너 표시 필요.\n'
        '남은 3일 이하면 업그레이드 클릭 유도로 전환.\n'
        '완료 조건: 가입 직후 체험 기간 확인 (완료), 배너 표시.'
    ),
    (
        '3890f457-4ef0-81d9-a8cd-ff58e81dd2f9', 'T-025',
        '[T-025] 플랜 업그레이드/다운그레이드 UI (Toss 전환)',
        'FILE: app/admin/billing/page.tsx, app/api/billing/change-plan/route.ts (new)\n\n'
        '[현재 플랜 표시]\n'
        '- hotels.subscription_plan + plan_expires_at 조회해서 현재 플랜 카드 하이라이트\n'
        '- 미결제 상태: toss_billing_key IS NULL AND subscription_plan != \'trial\' 일 때 \'기간 만료 후 중단\' 안내\n\n'
        '[업그레이드]\n'
        'POST /api/billing/change-plan {targetPlan}\n'
        '- toss_billing_key가 있는 경우: 즉시 새 금액으로 chargeBillingKey 후 subscription_plan 업데이트\n'
        '- toss_billing_key 없는 경우(최초 결제): 결제 UI(requestBillingAuth)로 이동\n'
        '- 업그레이드 후 plan_expires_at = now()+1month 갱신\n\n'
        '[다운그레이드]\n'
        '- 즉시 적용 아님. hotels.pending_plan 컬럼에 저장\n'
        '- 결제 주기 만료 후 billing-charge cron에서 pending_plan 기준으로 청구 후 업데이트\n'
        '- 확인 문구: \'결제 만료일(plan_expires_at)부터 {플랜명}으로 변경됩니다\'\n\n'
        '[DB]\n'
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS pending_plan TEXT CHECK (pending_plan IN ('starter','standard','pro'));\n\n"
        '완료 조건: 업그레이드 즉시 반영, 다운그레이드 예약 후 만료 반영 확인'
    ),
    (
        '3890f457-4ef0-8104-bfbf-fb89ef2b8828', 'T-026',
        '[T-026] 구독 해지 플로우 (Toss 전환)',
        'FILE: app/admin/billing/page.tsx, app/api/billing/cancel/route.ts (new)\n\n'
        '[해지 프로세스]\n'
        'Toss에 실제 구독 해지 API 없음 — billing_key 삭제만으로 다음 주기 자동 중단\n'
        'POST /api/billing/cancel:\n'
        '- 관리자 세션 확인\n'
        '- hotels.toss_billing_key = NULL 업데이트\n'
        '- pending_plan = NULL 업데이트 (예약 변경도 취소)\n'
        '- plan_expires_at는 그대로 유지 (기간 끝까지 사용 가능)\n\n'
        '[UI]\n'
        '- \'구독 해지\' 버튼 클릭 후 확인 모달\n'
        '- 해지 예약: \'plan_expires_at까지 사용, 이후 자동 갱신 없음\'\n'
        '- 해지 완료 후: 플랜 카드에 \'기간 만료 후 중단\' 상태로 표시\n'
        '- 재구독 버튼 제공 (클릭 시 requestBillingAuth로 새 billing_key 발급)\n\n'
        '[billing-charge cron 연동]\n'
        'toss_billing_key IS NULL이면 cron에서 자동 스킵됨 (이미 구현)\n'
        '만료 후 middleware에서 /admin/billing?expired=true로 리다이렉트 (이미 구현)\n\n'
        '완료 조건: 해지 후 toss_billing_key NULL 확인, 기간 끝까지 사용, 만료 후 잠금 확인'
    ),
    (
        '3890f457-4ef0-8169-8eb2-f171e1fb1742', 'T-027',
        '[T-027] 결제 내역 조회 UI (Toss 전환)',
        'FILE: supabase/migrations/007_payment_logs.sql (new), app/api/billing/invoices/route.ts (new), app/admin/billing/page.tsx (modify), lib/toss.ts (modify)\n\n'
        '[참고]\n'
        'Toss와 Stripe의 웹훅·청구 API 구조 차이로 인해 자체 DB 로그 필수\n\n'
        '[DB 마이그레이션]\n'
        'CREATE TABLE payment_logs (id UUID PK, hotel_id UUID FK, toss_order_id TEXT UNIQUE, amount INT, plan TEXT, status TEXT CHECK IN (success/failed), failure_reason TEXT, created_at TIMESTAMPTZ);\n'
        'CREATE INDEX ON payment_logs (hotel_id, created_at DESC);\n\n'
        '[lib/toss.ts 수정]\n'
        'chargeBillingKey 성공/실패 결과를 payment_logs에 INSERT (service client 사용)\n\n'
        '[API]\n'
        'GET /api/billing/invoices: 관리자 세션 후 hotel_id로 payment_logs 최근 20건 조회\n\n'
        '[UI]\n'
        '/admin/billing 하단 결제 내역 섹션 추가\n'
        '컬럼: 날짜, 플랜, 금액, 상태(성공/실패)\n'
        '실패 사유 hover 툴팁\n\n'
        '완료 조건: 결제 후 내역 테이블에 기록 확인'
    ),
    (
        '3870f457-4ef0-810b-9850-edb56ab63fe4', 'T-031', None,
        'app/api/cron/daily-report/route.ts 구현 완료 (KST 아침 발송 크론, 전날 통계+완료율+딜레이, DailyReportEmail 컴포넌트)'
    ),
    (
        '3870f457-4ef0-816c-8e7d-d047234e4d16', 'T-040', None,
        'app/admin/stats/page.tsx에 탭 추가 구현.\n'
        '일/주/월 탭 전환, loadChartData() 함수로 선택된 기간 기준 fetch\n'
        '실제 BarChart 컴포넌트 활용 (recharts 라이브러리 - 미설치)\n'
        '일별: 최근 7일 완료 수 BarChart\n'
        '주별: 최근 30일 주간 BarChart\n'
        '월별: 직원별 처리 건수 + 평균 완료 시간\n'
        'CSV 내보내기 버튼 UI만 추가 (API는 T-041에서 구현)'
    ),
    (
        '3870f457-4ef0-8184-bde7-e0ca43ea736a', 'T-041', None,
        'FILE: app/api/admin/stats/export/route.ts (new)\n\n'
        '[현재 상태]\n'
        'stats/page.tsx에 이미 CSV 내보내기 버튼 UI 있음\n'
        '버튼 클릭 시 window.open(\'/api/admin/stats/export?date=YYYY-MM-DD\', \'_blank\') 호출\n'
        'API 구현 없어서 동작 안 함. papaparse 라이브러리 아직 미설치\n\n'
        '[API - GET /api/admin/stats/export]\n'
        'query param: date (YYYY-MM-DD, 기본값 오늘)\n'
        '관리자 Supabase 세션 후 hotelId 추출\n\n'
        '조회:\n'
        'assignments WHERE rooms.hotel_id=hotelId AND completed_at BETWEEN dateStart AND dateEnd\n'
        'staff 정보 조인\n\n'
        '데이터 가공: { staffName, completedCount, totalMinutes } → avgMinutes 계산\n\n'
        'CSV 출력 (직접 생성):\n'
        '헤더: 날짜,직원명,완료건수,평균완료시간(분)\n'
        '각 행: date, staffName, completedCount, avgMinutes\n\n'
        '응답 헤더:\n'
        'Content-Type: text/csv; charset=utf-8\n'
        'Content-Disposition: attachment; filename=roomly-stats-{date}.csv\n'
        'UTF-8 BOM: 엑셀 호환을 위해 앞에 추가 (엑셀 한글 깨짐 방지)\n\n'
        '완료 조건: CSV 다운로드 후 엑셀에서 한글 깨짐 없이 열림'
    ),
    (
        '3890f457-4ef0-8154-ac90-d50432caacf1', 'T-052', None,
        'app/admin/onboarding/OnboardingWizard.tsx 구현 완료 '
        '(Step1: 방 추가/시간 설정, Step2: 직원 추가+QR 다운로드). '
        '3단계 예정이었으나 2단계로 최적화 (PWA 설치 안내 제외)'
    ),
    (
        '3890f457-4ef0-8190-adfb-fa0462ff4419', 'T-057', None,
        'FILE: app/api/admin/staff/[id]/route.ts (PATCH 추가), app/admin/staff/page.tsx (수정)\n\n'
        '[API - PATCH /api/admin/staff/[id]]\n'
        'body: { name?: string, phone_number?: string, role?: \'housekeeping\' | \'dirty\' }\n\n'
        '수정 로직:\n'
        '1. 관리자 세션 확인\n'
        '2. service client로 staff 조회 (hotel_id 격리 - 타 호텔 직원 수정 방지)\n'
        '3. role 변경 시: 기존 staff.role !== body.role 이면 qr_version++ 후 UPDATE\n'
        '4. name/phone_number만 변경 시 qr_version 유지\n'
        '5. UPDATE staff SET name=?, phone_number=?, role=?, qr_version=? WHERE id=? AND hotel_id=?\n'
        '6. 응답: { id, name, phone_number, role, qr_version }\n\n'
        '[role 변경 시 QR 무효화]\n'
        'qr_version 올라가면 기존 JWT의 qr_version과 DB 값 불일치\n'
        '→ /api/auth/qr에서 staff.qr_version !== token.qr_version 이면 401 반환 (기존 QR 만료)\n'
        '→ 관리자가 새 QR 재발급: POST /api/admin/staff/[id]/qr\n\n'
        '[UI - app/admin/staff/page.tsx]\n'
        '직원 카드에 수정 버튼(펜 아이콘) 추가\n'
        '클릭 시 수정 모달: 이름, 전화번호, 역할 선택(청소/더티) 인풋\n'
        'Save 클릭 시 PATCH /api/admin/staff/[id] 호출\n'
        'role 변경 시: \'기존 QR이 무효화됩니다. 새 QR을 인쇄해 주세요.\' + QR 재발급 버튼\n\n'
        '완료 조건: 역할 변경 후 구 QR로 /login?error=qr_expired 이동'
    ),
    (
        '3890f457-4ef0-8119-9fc1-d34c486de905', 'T-058', None,
        'FILE: supabase/migrations/007_settings.sql (new), app/admin/settings/page.tsx (new), app/api/admin/settings/route.ts (new)\n\n'
        '[DB 마이그레이션 - 007_settings.sql]\n'
        'ALTER TABLE hotels\n'
        '  ADD COLUMN IF NOT EXISTS checkin_alert_minutes INTEGER NOT NULL DEFAULT 120,\n'
        '  ADD COLUMN IF NOT EXISTS agreed_terms_at TIMESTAMPTZ;\n\n'
        '[API - /api/admin/settings]\n'
        'GET: hotels에서 name, admin_email, checkin_alert_minutes 조회\n'
        'PATCH body: { hotelName?, checkinAlertMinutes?, newPassword? }\n'
        '- hotelName: UPDATE hotels.name\n'
        '- checkinAlertMinutes: 30~480 범위 검증 후 UPDATE hotels.checkin_alert_minutes\n'
        '- newPassword: supabase.auth.updateUser({ password })\n\n'
        '[AdminDashboard.tsx 수정]\n'
        '기존: const ALERT_MINUTES = Number(process.env.NEXT_PUBLIC_CHECKIN_ALERT_MINUTES ?? 120)\n'
        '변경: 관리자 hotels.checkin_alert_minutes 동적으로 props로 전달\n'
        'page.tsx에서 hotel.checkin_alert_minutes 같이 fetch 후 AdminDashboard props로 넘김\n\n'
        '[UI - /admin/settings]\n'
        '- 호텔명 수정 인풋\n'
        '- 체크인 알림 시간 설정 (분 단위 또는 드롭다운: 30/60/90/120/180/240분)\n'
        '- 비밀번호 변경 폼 (Supabase Auth 업데이트)\n'
        '- AdminNav에 설정 링크 추가 (이미 추가됨)\n\n'
        '완료 조건: 알림 시간 변경 후 현황판에 즉시 반영'
    ),
    (
        '3890f457-4ef0-81aa-8ef4-d2cf4ad321db', 'T-082',
        '[T-082] Toss 웹훅 멱등성 + 슈퍼어드민 알림',
        'FILE: app/api/billing/webhook/route.ts (modify)\n\n'
        '[멱등성 처리]\n'
        '동일한 결제 이벤트 중복 수신 시 중복 처리 방지\n\n'
        '[멱등성]\n'
        'payment_logs 테이블의 toss_order_id UNIQUE 제약으로 중복 방지\n'
        'INSERT OR IGNORE 방식: 이미 동일 orderId 있으면 처리 스킵\n\n'
        '[서명 검증]\n'
        'x-toss-signature 헤더로 TOSS_PAYMENTS_WEBHOOK_SECRET 검증 (선택사항)\n\n'
        '[슈퍼어드민 알림]\n'
        '결제 실패 이벤트 시 슈퍼어드민 이메일 발송 (Resend)\n'
        '내용: eventType, hotel customerKey, 결제 금액 정보\n'
        'SUPER_ADMIN_EMAIL 환경변수로 수신자 설정\n\n'
        '[이벤트 타입 처리]\n'
        'PAYMENT_STATUS_CHANGED + status=DONE → 구독 갱신 + payment_logs INSERT(success)\n'
        'PAYMENT_STATUS_CHANGED + status=CANCELED → trial 되돌리기 + payment_logs INSERT(failed)\n\n'
        '완료 조건: 동일 웹훅 2회 수신 시 1회만 처리, 실패 이벤트 시 슈퍼어드민 이메일 수신'
    ),
    (
        '3890f457-4ef0-81e1-a4b2-f7745a6f46f9', 'T-083', None,
        'FILE: supabase/migrations/008_email_logs.sql (new), lib/email.ts (modify)\n\n'
        '[DB 마이그레이션 - 008_email_logs.sql]\n'
        'CREATE TABLE email_logs (\n'
        '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n'
        '  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,\n'
        '  to_email TEXT NOT NULL,\n'
        '  subject TEXT NOT NULL,\n'
        '  status TEXT NOT NULL CHECK (status IN (\'sent\',\'failed\')),\n'
        '  error_message TEXT,\n'
        '  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n'
        ');\n'
        'CREATE INDEX ON email_logs (hotel_id, created_at DESC);\n'
        'CREATE INDEX ON email_logs (status, created_at DESC) WHERE status = \'failed\';\n\n'
        '[lib/email.ts 수정]\n'
        'sendEmail()에 hotelId 파라미터 추가하여 로그 기록\n'
        '성공 시: email_logs INSERT (status=\'sent\')\n'
        '실패 시: email_logs INSERT (status=\'failed\', error_message) 후 에러는 무시\n'
        'RESEND_API_KEY 없으면 조용히 스킵\n\n'
        '[이메일 발송 실패 처리]\n'
        'daily-report cron: 이메일 실패해도 크론 자체는 성공으로 처리 (다음 날 재실행)\n'
        '실패 이메일은 email_logs 조회로 확인 (모니터링 목적)\n\n'
        '[수정사항: room_limit 상수화]\n'
        'rooms/route.ts의 ROOM_LIMITS 상수로 관리 (trial:50, starter:50, standard:150, pro:9999)\n\n'
        '완료 조건: 이메일 발송 후 email_logs 테이블 기록 확인, 실패 시 status=failed 레코드 확인'
    ),
    (
        '3890f457-4ef0-810b-8b20-e19aa0af0b8e', 'T-086',
        '[T-086] 결제 실패 이메일 템플릿 (Toss 전환)',
        'FILE: app/api/cron/billing-charge/route.ts (modify), emails/PaymentFailedEmail.tsx (new)\n\n'
        '[현재 문제]\n'
        'billing-charge cron에서 결제 실패 시 text 문자열로 이메일 → React 컴포넌트로 교체\n\n'
        '[PaymentFailedEmail.tsx]\n'
        'Resend React Email 컴포넌트\n'
        '내용:\n'
        '- 호텔명, 실패 사유, 실패 금액\n'
        '- 결제 수단 업데이트 안내 링크 → /admin/billing\n'
        '- 남은 이용 기간 안내 (실패해도 trial로 되돌리기 - billing-charge에서 처리 중)\n\n'
        '[billing-charge cron 수정]\n'
        '기존 text 문자열 이메일 → PaymentFailedEmail React 컴포넌트로 교체\n\n'
        '[Toss 웹훅 연동]\n'
        'webhook에서 PAYMENT_STATUS_CHANGED + ABORTED/EXPIRED 이벤트도 결제 실패 이메일 발송\n'
        '(현재 webhook은 DONE/CANCELED만 처리 중 - ABORTED 처리 필요)\n\n'
        '완료 조건: billing-charge 실패 시 5분 내 결제 실패 이메일 수신 (React 템플릿 적용)'
    ),
    (
        '3890f457-4ef0-8197-8478-f1b141455b44', 'T-087', None,
        'app/api/cron/trial-ending/route.ts 구현 완료 '
        '(trial_ends_at 7일 이내 호텔 대상 TrialEndingEmail 발송). '
        'D-3/D-1 타이밍 체크 중복 발송 방지 로직'
    ),
    (
        '3890f457-4ef0-814b-bc64-c30505297284', 'T-092', None,
        'supabase/migrations/005_patch.sql에서 처리 완료.\n'
        '추가된 컬럼: toss_customer_key(UNIQUE), toss_billing_key, trial_ends_at, plan_expires_at, last_active_at\n'
        'subscription_plan CHECK에 \'trial\' 추가, DEFAULT \'trial\' 적용\n\n'
        '[room_limit 상수화 처리]\n'
        'rooms/route.ts의 ROOM_LIMITS 상수로 관리 (trial:50, starter:50, standard:150, pro:9999)\n'
        'DB 컬럼이 아닌 상수 기반으로 처리하여 마이그레이션 불필요\n\n'
        '[Stripe 컬럼 제거]\n'
        'stripe_customer_id, stripe_subscription_id: 005_patch.sql에서 DROP IF EXISTS 처리'
    ),
    (
        '3890f457-4ef0-8120-b3c4-ff66685aec77', 'T-095', None,
        '배포 전 Vercel 대시보드에 모든 환경변수 등록. .env.local.example 참조.\n\n'
        '[필수]\n'
        'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY\n'
        'JWT_SECRET - Supabase Settings > API > JWT Secret\n'
        'NEXT_PUBLIC_APP_URL - 실제 배포 도메인\n\n'
        '[보안]\n'
        'CRON_SECRET - node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" 로 생성\n\n'
        '[푸시 알림]\n'
        'NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL\n'
        '생성: npx web-push generate-vapid-keys\n'
        '주의: VAPID_SUBJECT 아닌 VAPID_EMAIL 사용 (lib/push.ts 기준)\n\n'
        '[이메일]\n'
        'RESEND_API_KEY - https://resend.com/api-keys\n'
        'EMAIL_FROM - Roomly <noreply@roomly.app>\n'
        'Resend 도메인 DNS (MX, SPF, DKIM) roomly.app에 등록 필요\n\n'
        '[결제(Toss)]\n'
        'TOSS_PAYMENTS_CLIENT_KEY, TOSS_PAYMENTS_SECRET_KEY - 토스페이먼츠 대시보드 > 개발 연동 > API 키\n'
        'TOSS_PAYMENTS_WEBHOOK_SECRET - 웹훅 설정 시 발급\n'
        '웹훅 URL: https://roomly.app/api/billing/webhook\n\n'
        '[슈퍼어드민]\n'
        'SUPER_ADMIN_PASSWORD_HASH - SHA-256 해시\n'
        'SUPER_ADMIN_EMAIL - 결제 실패 알림 수신용 (T-082)\n\n'
        '[AI 기능 - AI-01~AI-03 구현 시 필요]\n'
        'ANTHROPIC_API_KEY - https://console.anthropic.com\n'
        '미설정 시 AI 기능 자동 비활성화 (fallback 처리됨)\n\n'
        '완료 조건: Vercel 대시보드 > Settings > Environment Variables 모두 등록 확인'
    ),
    (
        '3890f457-4ef0-816a-8969-c8c2853e7020', 'T-180', None,
        'FILE: app/terms/page.tsx (new), app/(marketing)/layout.tsx 공유 레이아웃 적용\n\n'
        '[법적 내용 - AI 초안 후 검토 필수]\n'
        '실제 서비스에 맞게 수정 필요. Claude에게 초안 작성 후 내용 조정.\n\n'
        '[이용약관 주요 항목 - 국내 이커머스 표준]\n'
        '1. 서비스 개요와 이용 조건 (가입, 탈퇴, 자격)\n'
        '2. 서비스 이용요금 및 결제 방법\n'
        '3. 구독 취소와 환불 기준 (구독일로부터 7일 이내)\n'
        '4. 금지 행위: 타 호텔 데이터 무단 접근, 악의적 API 남용 등\n'
        '5. 면책조항: 천재지변, 서비스 장애 3일 이하 시 환불 없음\n'
        '6. 개인정보 수집·처리 방침 (T-182 연동)\n'
        '7. 분쟁 해결 및 준거법 (대한민국 법률 적용)\n'
        '8. 약관 변경: 7일 전 공지 의무\n'
        '9. 시행일: 공개일 명시\n\n'
        '[UI]\n'
        'SSR 정적 렌더링 (Server Component)\n'
        '마케팅 레이아웃에 헤더/푸터 공유\n'
        '랜딩 페이지 푸터에 링크 연결 필요\n\n'
        '완료 조건: /terms 페이지 접속 가능, 랜딩에서 링크 연결 확인'
    ),
    (
        '3890f457-4ef0-8179-be0b-da67a07bcbca', 'T-181', None,
        'FILE: app/privacy/page.tsx (new)\n\n'
        '[법적 내용]\n'
        'T-180과 동일 - Claude 초안 후 실제 데이터 처리 현황에 맞게 수정\n\n'
        '[개인정보처리방침 주요 항목 - 개인정보보호법 제30조]\n'
        '1. 수집 항목:\n'
        '   필수: 이메일, 호텔명\n'
        '   선택: 전화번호, 직원정보\n'
        '   결제: 토스페이먼츠를 통한 billing_key (Roomly에 카드번호 저장 안 함)\n'
        '2. 수집 목적: 서비스 제공, 결제 처리, 서비스 개선\n'
        '3. 보유 기간:\n'
        '   회원 정보: 회원 탈퇴 시 즉시 삭제\n'
        '   결제 기록: 5년 (전자상거래법)\n'
        '   로그 데이터: 3개월 후 삭제\n'
        '4. 제3자 제공:\n'
        '   Supabase (DB/Auth - 미국 서버)\n'
        '   Resend (이메일 발송 - 미국)\n'
        '   토스페이먼츠 (결제 처리 - 한국)\n'
        '   Anthropic (AI 기능 - 미국, 선택적 기능 사용시)\n'
        '5. 열람 및 삭제 요청\n'
        '6. 개인정보 보호책임자: admin@roomly.app\n'
        '7. 보유 기간: DB 삭제 후 30일 이내 완전 삭제\n'
        '8. 고지의무 이행방법: 홈페이지, 이메일\n\n'
        '[UI]\n'
        'SSR 정적 렌더링, 마케팅 레이아웃\n'
        '약관과 동일한 스타일 적용\n\n'
        '완료 조건: /privacy 페이지 접속, T-183 회원가입 체크박스에서 링크 연결'
    ),
    (
        '3890f457-4ef0-815c-a241-d42eb03aac76', 'T-183', None,
        'FILE: app/signup/page.tsx (modify), app/api/auth/signup/route.ts (modify), '
        'supabase/migrations/007_settings.sql (수정 - agreed_terms_at 컬럼 이미 포함)\n\n'
        '[UI - signup/page.tsx]\n'
        '이메일 입력 아래 동의 체크박스 2개 추가:\n'
        '☐ (필수) 이용약관에 동의합니다 → /terms 링크\n'
        '☐ (필수) 개인정보처리방침에 동의합니다 → /privacy 링크\n'
        '☐ (선택) 마케팅 이메일 수신에 동의합니다\n'
        '전체 필수 체크 완료 전까지 가입 버튼 비활성화 (disabled)\n\n'
        '[API - signup/route.ts 수정]\n'
        'body에 agreedTerms: boolean, agreedMarketing: boolean 추가\n'
        'agreedTerms가 false이면 400 반환\n'
        'hotels INSERT 시 agreed_terms_at: new Date().toISOString() 포함\n'
        '(agreed_terms_at 컬럼은 T-058의 007_settings.sql에서 이미 추가됨)\n\n'
        'marketingConsent는 별도 컬럼 없이 추후 구현 (선택사항)\n\n'
        '완료 조건: 체크 없이 가입 버튼 비활성화 확인, agreed_terms_at DB 기록 확인'
    ),
]

print(f'총 {len(FIXES)}개 티켓 수정 시작...\n')

for i, (page_id, tid, name, desc) in enumerate(FIXES, 1):
    print(f'[{i}/{len(FIXES)}] {tid} 수정 중...', end=' ')
    status = patch(page_id, name=name, desc=desc)
    print(f'→ {status}')
    time.sleep(0.35)

print('\n완료!')
