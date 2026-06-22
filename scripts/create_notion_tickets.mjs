const TOKEN = 'ntn_h40993625448BPM2GRFXYnGK6zF0dOnhv8QMfHdMOA18J0';
const PAGE_ID = '3870f4574ef0804b84f3f737f733f1f9';

async function api(method, path, body) {
  const res = await fetch('https://api.notion.com/v1' + path, {
    method,
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// 1. DB 생성
const db = await api('POST', '/databases', {
  parent: { type: 'page_id', page_id: PAGE_ID },
  title: [{ type: 'text', text: { content: 'Roomly 개발 티켓' } }],
  properties: {
    'Name':        { title: {} },
    'TicketID':    { rich_text: {} },
    'Phase':       { select: { options: [
      { name: 'Phase 1', color: 'green' },
      { name: 'Phase 2', color: 'blue' },
      { name: 'Phase 3', color: 'purple' },
    ]}},
    'Priority':    { select: { options: [
      { name: 'P0', color: 'red' },
      { name: 'P1', color: 'orange' },
      { name: 'P2', color: 'yellow' },
    ]}},
    'Type':        { select: { options: [
      { name: 'UI', color: 'blue' },
      { name: 'API', color: 'green' },
      { name: 'Config', color: 'gray' },
      { name: 'DB', color: 'purple' },
      { name: 'Middleware', color: 'pink' },
      { name: 'Content', color: 'yellow' },
      { name: 'Cron', color: 'orange' },
    ]}},
    'Status':      { select: { options: [
      { name: 'Done', color: 'green' },
      { name: 'In Progress', color: 'blue' },
      { name: 'Todo', color: 'gray' },
    ]}},
    'Description': { rich_text: {} },
  },
});

if (db.object === 'error') {
  console.error('DB 생성 실패:', db.message);
  process.exit(1);
}

const DB_ID = db.id;
console.log('DB 생성 완료:', DB_ID);

// 2. 티켓 목록
const tickets = [
  // Phase 1 - 완료
  { id:'T-001', name:'오프라인 배너 UI', phase:'Phase 1', priority:'P1', type:'UI', status:'Done', desc:'직원 오프라인 시 amber 배너, 온라인 복귀 시 자동 refetch' },
  { id:'T-002', name:'로딩 스켈레톤 UI', phase:'Phase 1', priority:'P2', type:'UI', status:'Done', desc:'현황판·통계 초기 로딩 시 animate-pulse 스켈레톤 (loading.tsx)' },
  { id:'T-003', name:'전역 에러 페이지', phase:'Phase 1', priority:'P2', type:'UI', status:'Done', desc:'404 not-found.tsx, 500 error.tsx 브랜딩 에러 페이지' },
  { id:'T-004', name:'AdminNav 공통 네비게이션', phase:'Phase 1', priority:'P1', type:'UI', status:'Done', desc:'관리자 4페이지 공통 네비, 모바일 하단 탭바, 로그아웃 공통화' },
  { id:'T-005', name:'TypeScript 엄격 모드 정리', phase:'Phase 1', priority:'P2', type:'Config', status:'Done', desc:'npm run build 에러 0개, any 타입 제거' },
  // Phase 2 - 푸시 알림
  { id:'T-010', name:'푸시 알림 인프라 설정', phase:'Phase 2', priority:'P0', type:'Config', status:'Done', desc:'VAPID 키 발급, sw-push.js, lib/push.ts, push_subscriptions 테이블' },
  { id:'T-011', name:'푸시 알림 구독 API', phase:'Phase 2', priority:'P0', type:'API', status:'Todo', desc:'POST/DELETE /api/push/subscribe — 직원 JWT 검증 후 DB UPSERT' },
  { id:'T-012', name:'직원 벨 버튼 UI', phase:'Phase 2', priority:'P1', type:'UI', status:'Todo', desc:'WorkerDashboard 헤더 벨 버튼, idle/subscribed/denied/unsupported 상태' },
  { id:'T-013', name:'배정 시 푸시 자동 발송', phase:'Phase 2', priority:'P0', type:'API', status:'Todo', desc:'assign API에서 sendPushToStaff 비차단 호출' },
  { id:'T-014', name:'체크인 긴급 알림 (관리자)', phase:'Phase 2', priority:'P1', type:'API', status:'Todo', desc:'체크인 2시간 전 미완료 방 → 관리자 푸시, room_logs로 중복 방지' },
  // Phase 2 - 결제
  { id:'T-020', name:'Stripe 기본 연동', phase:'Phase 2', priority:'P0', type:'Config', status:'Done', desc:'lib/stripe.ts, 004_billing.sql, create-session API, webhook API' },
  { id:'T-021', name:'결제 플랜 UI', phase:'Phase 2', priority:'P0', type:'UI', status:'Done', desc:'/admin/billing 3플랜 카드, 30일 무료 체험, Stripe Checkout 연동' },
  { id:'T-022', name:'Stripe 웹훅 처리', phase:'Phase 2', priority:'P0', type:'API', status:'Done', desc:'checkout.completed / invoice.succeeded / subscription.deleted 처리' },
  { id:'T-023', name:'플랜 만료 시 잠금', phase:'Phase 2', priority:'P1', type:'Middleware', status:'Todo', desc:'plan_expires_at 만료 시 /admin/billing?expired=true 리다이렉트' },
  // Phase 2 - 이메일
  { id:'T-030', name:'Resend 이메일 연동', phase:'Phase 2', priority:'P1', type:'Config', status:'Done', desc:'lib/email.ts, WelcomeEmail.tsx, 가입 시 환영 이메일 자동 발송' },
  { id:'T-031', name:'일일 리포트 이메일 크론', phase:'Phase 2', priority:'P1', type:'Cron', status:'Todo', desc:'매일 UTC 23:00(KST 08:00) 전날 통계 요약 이메일 자동 발송' },
  // Phase 2 - 통계
  { id:'T-040', name:'통계 주간/월간 차트', phase:'Phase 2', priority:'P1', type:'UI', status:'Todo', desc:'recharts BarChart, 일/주/월 탭, 직원별 처리 시간 추이' },
  { id:'T-041', name:'통계 CSV 내보내기', phase:'Phase 2', priority:'P2', type:'UI', status:'Todo', desc:'papaparse, GET /api/admin/stats/export, UTF-8 BOM 처리' },
  // Phase 2 - 랜딩
  { id:'T-050', name:'랜딩 페이지', phase:'Phase 2', priority:'P0', type:'UI', status:'Done', desc:'/ Hero·비교·기능·요금제·CTA, SSR 정적 페이지' },
  { id:'T-051', name:'SEO 메타데이터', phase:'Phase 2', priority:'P2', type:'Config', status:'Todo', desc:'OG 이미지, sitemap.xml, robots.txt, 호텔 하우스키핑 키워드' },
  // Phase 2 - 슈퍼어드민
  { id:'T-060', name:'슈퍼어드민 대시보드', phase:'Phase 2', priority:'P1', type:'UI', status:'Done', desc:'/super-admin 라이선스 발급·호텔 현황, SHA-256 비밀번호 인증' },
  { id:'T-061', name:'슈퍼어드민 수익 현황', phase:'Phase 2', priority:'P2', type:'UI', status:'Todo', desc:'MRR 표시, Stripe API로 활성 구독 집계, 플랜별 호텔 수' },
  // Phase 2 - 보안
  { id:'T-070', name:'API Rate Limiting', phase:'Phase 2', priority:'P1', type:'Middleware', status:'Todo', desc:'Upstash Redis, /api/auth/* IP당 10회/분, /api/admin/* 60회/분' },
  { id:'T-071', name:'로그인 시도 제한', phase:'Phase 2', priority:'P1', type:'UI', status:'Todo', desc:'5회 실패 시 30분 잠금, Redis 카운터, 성공 시 리셋' },
  // Phase 2 - UX
  { id:'T-080', name:'체크인 일괄 등록 모달', phase:'Phase 2', priority:'P2', type:'UI', status:'Todo', desc:'현황판 버튼 → 전체 객실 시간 일괄 입력, 전체 같은 시간 퀵 버튼' },
  { id:'T-081', name:'배정 UX 개선', phase:'Phase 2', priority:'P2', type:'UI', status:'Todo', desc:'직원 칩 인라인, 드롭다운 배정, 모바일 bottom sheet' },
  // Phase 3 - 다국어
  { id:'T-100', name:'다국어 next-intl 설정', phase:'Phase 3', priority:'P0', type:'Config', status:'Todo', desc:'ko/en/vi 로케일, middleware 통합, messages/ko.json 문자열 추출' },
  { id:'T-101', name:'영어 번역', phase:'Phase 3', priority:'P1', type:'Content', status:'Todo', desc:'직원 화면 전용 영어 번역, dirty→Checkout/cleaning→In Progress' },
  { id:'T-102', name:'베트남어 번역', phase:'Phase 3', priority:'P1', type:'Content', status:'Todo', desc:'외국인 하우스키퍼 대응, 직원 화면 전용 vi.json' },
  // Phase 3 - PMS
  { id:'T-110', name:'PMS 웹훅 수신', phase:'Phase 3', priority:'P1', type:'API', status:'Todo', desc:'checkout 이벤트 → dirty 전환, X-Roomly-Webhook-Secret 인증' },
  { id:'T-111', name:'Mews PMS 어댑터', phase:'Phase 3', priority:'P2', type:'API', status:'Todo', desc:'Mews ReservationUpdated → 내부 포맷 변환, 방 번호 매핑' },
  // Phase 3 - 비품
  { id:'T-120', name:'비품 관리 DB 스키마', phase:'Phase 3', priority:'P1', type:'DB', status:'Todo', desc:'supplies, supply_requests 테이블, RLS 정책 설정' },
  { id:'T-121', name:'비품 직원 요청 UI', phase:'Phase 3', priority:'P1', type:'UI', status:'Todo', desc:'청소 완료 시 비품 사용량 기록 모달 (선택 사항)' },
  { id:'T-122', name:'비품 재고 현황판', phase:'Phase 3', priority:'P1', type:'UI', status:'Todo', desc:'/admin/supplies 재고 테이블, 임계치 이하 빨간 강조' },
  // Phase 3 - 유지보수
  { id:'T-130', name:'유지보수 신고 DB + API', phase:'Phase 3', priority:'P1', type:'DB', status:'Todo', desc:'maintenance_requests 테이블, Supabase Storage 사진 업로드' },
  { id:'T-131', name:'유지보수 직원 신고 UI', phase:'Phase 3', priority:'P1', type:'UI', status:'Todo', desc:'객실 카드 수리 신고 버튼, 카메라 capture, 설명+사진 제출' },
  { id:'T-132', name:'유지보수 관리자 처리 UI', phase:'Phase 3', priority:'P1', type:'UI', status:'Todo', desc:'/admin/maintenance 신고 목록, open→in_progress→resolved' },
  // Phase 3 - 공개 API
  { id:'T-140', name:'공개 API 키 발급', phase:'Phase 3', priority:'P2', type:'UI', status:'Todo', desc:'/admin/settings API 키 발급, SHA-256 해시 저장, Bearer 검증' },
  { id:'T-141', name:'공개 REST 엔드포인트', phase:'Phase 3', priority:'P2', type:'API', status:'Todo', desc:'GET/PATCH /api/v1/rooms, GET /api/v1/assignments, 키당 100회/분' },
  // Phase 3 - 체인
  { id:'T-150', name:'체인 호텔 법인 계정', phase:'Phase 3', priority:'P2', type:'DB', status:'Todo', desc:'organizations 테이블, hotels.org_id, org_admin 역할' },
  { id:'T-151', name:'멀티 프로퍼티 현황판', phase:'Phase 3', priority:'P2', type:'UI', status:'Todo', desc:'/org/[orgId] 법인 전체 호텔 완료율 비교, 30초 폴링' },
];

// 3. 티켓 생성
let done = 0;
for (const t of tickets) {
  const res = await api('POST', '/pages', {
    parent: { database_id: DB_ID },
    properties: {
      'Name':        { title: [{ text: { content: `[${t.id}] ${t.name}` } }] },
      'TicketID':    { rich_text: [{ text: { content: t.id } }] },
      'Phase':       { select: { name: t.phase } },
      'Priority':    { select: { name: t.priority } },
      'Type':        { select: { name: t.type } },
      'Status':      { select: { name: t.status } },
      'Description': { rich_text: [{ text: { content: t.desc } }] },
    },
  });
  if (res.object === 'error') {
    console.error(`실패 ${t.id}: ${res.message}`);
  } else {
    done++;
    process.stdout.write(`\r${done}/${tickets.length} 완료...`);
  }
  await new Promise(r => setTimeout(r, 350));
}
console.log(`\n\n전체 완료: ${done}개 티켓 생성`);
