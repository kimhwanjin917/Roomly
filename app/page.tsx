import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roomly — 호텔 객실 청소, 한 화면에서 실시간으로',
  description:
    '배정부터 완료 확인까지 전화 없이. QR로 직원이 바로 접속하고, 모든 객실 상태가 실시간 현황판에 나타납니다.',
}

/* ================= 커스텀 아이콘 세트 =================
   24px 그리드 · 1.7 스트로크 · 듀오톤(면 12% + 선) 공통 언어 */

function IconBoard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="3" fill="currentColor" opacity=".12" />
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.7" />
      <rect x="6.2" y="12" width="4.6" height="4.6" rx="1.2" fill="currentColor" />
      <rect x="13.2" y="12" width="4.6" height="4.6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6.8" cy="6.5" r="1" fill="currentColor" />
      <circle cx="9.8" cy="6.5" r="1" fill="currentColor" opacity=".4" />
    </svg>
  )
}

function IconQrScan({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M3 7.5V5a2 2 0 0 1 2-2h2.5M16.5 3H19a2 2 0 0 1 2 2v2.5M21 16.5V19a2 2 0 0 1-2 2h-2.5M7.5 21H5a2 2 0 0 1-2-2v-2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="7" y="7" width="10" height="10" rx="1.6" fill="currentColor" opacity=".12" />
      <rect x="8.6" y="8.6" width="3" height="3" rx=".7" fill="currentColor" />
      <rect x="12.6" y="8.6" width="3" height="3" rx=".7" fill="currentColor" opacity=".4" />
      <rect x="8.6" y="12.6" width="3" height="3" rx=".7" fill="currentColor" opacity=".4" />
      <rect x="12.6" y="12.6" width="3" height="3" rx=".7" fill="currentColor" />
    </svg>
  )
}

function IconPing({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 4a6 6 0 0 0-6 6v3.2c0 .5-.2 1-.6 1.4L4 16h16l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 0 0-6-6Z" fill="currentColor" opacity=".12" />
      <path d="M12 4a6 6 0 0 0-6 6v3.2c0 .5-.2 1-.6 1.4L4 16h16l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 0 0-6-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17.5" cy="5.5" r="3" fill="currentColor" />
    </svg>
  )
}

function IconRooms({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14H4Z" fill="currentColor" opacity=".12" />
      <path d="M2.5 20h19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="7.2" y="7.2" width="3.4" height="3.4" rx=".8" fill="currentColor" />
      <rect x="13.4" y="7.2" width="3.4" height="3.4" rx=".8" fill="currentColor" opacity=".4" />
      <rect x="7.2" y="13" width="3.4" height="3.4" rx=".8" fill="currentColor" opacity=".4" />
      <rect x="13.4" y="13" width="3.4" height="3.4" rx=".8" fill="currentColor" />
    </svg>
  )
}

function IconPrint({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M7 8V4h10v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3.5" y="8" width="17" height="9" rx="2" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="1.7" />
      <rect x="7" y="13.5" width="10" height="6.5" rx="1.2" fill="#fff" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9.5 16.5h5M9.5 18.2h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="17.5" cy="10.8" r="1" fill="currentColor" />
    </svg>
  )
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M20.5 3.5 3.6 9.9c-.9.3-.9 1.6 0 1.9l6 2c.3.1.5.3.6.6l2 6c.3.9 1.6.9 1.9 0L20.5 3.5Z" fill="currentColor" opacity=".12" />
      <path d="M20.5 3.5 3.6 9.9c-.9.3-.9 1.6 0 1.9l6 2c.3.1.5.3.6.6l2 6c.3.9 1.6.9 1.9 0L20.5 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m10 14 4.5-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8.2 12.2 2.6 2.6 5-5.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/* ================= 현황판 목업 데이터 ================= */

type RoomStatus = 'waiting' | 'cleaning' | 'done'

const STATUS_META: Record<RoomStatus, { chip: string; dot: string; label: string }> = {
  waiting: { chip: 'bg-amber-50 ring-amber-200/70 text-amber-800', dot: 'bg-amber-400', label: '대기' },
  cleaning: { chip: 'bg-blue-50 ring-blue-200/70 text-blue-800', dot: 'bg-blue-500', label: '청소 중' },
  done: { chip: 'bg-emerald-50 ring-emerald-200/70 text-emerald-800', dot: 'bg-emerald-500', label: '완료' },
}

const MOCK_ROOMS: { no: string; status: RoomStatus; who?: string }[] = [
  { no: '201', status: 'done', who: '김' }, { no: '202', status: 'done', who: '김' },
  { no: '203', status: 'cleaning', who: '박' }, { no: '204', status: 'waiting' },
  { no: '205', status: 'done', who: '이' }, { no: '206', status: 'done', who: '이' },
  { no: '301', status: 'done', who: '박' }, { no: '302', status: 'cleaning', who: '이' },
  { no: '303', status: 'done', who: '김' }, { no: '304', status: 'done', who: '박' },
  { no: '305', status: 'waiting' }, { no: '306', status: 'done', who: '이' },
  { no: '401', status: 'waiting' }, { no: '402', status: 'done', who: '김' },
  { no: '403', status: 'done', who: '김' }, { no: '404', status: 'cleaning', who: '박' },
  { no: '405', status: 'done', who: '이' }, { no: '406', status: 'done', who: '박' },
]

function RoomCard({ no, status, who }: { no: string; status: RoomStatus; who?: string }) {
  const meta = STATUS_META[status]
  return (
    <div className={`rounded-xl ring-1 px-2 py-2 sm:px-2.5 flex flex-col items-center gap-1.5 ${meta.chip}`}>
      <span className="text-[11px] sm:text-xs font-bold tabular-nums leading-none">{no}</span>
      <span className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        {who ? (
          <span className="text-[9px] font-semibold opacity-70 leading-none">{who}</span>
        ) : (
          <span className="text-[9px] font-semibold opacity-40 leading-none">—</span>
        )}
      </span>
    </div>
  )
}

function StatusLegend() {
  return (
    <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
      {(Object.keys(STATUS_META) as RoomStatus[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />
          {STATUS_META[s].label}
        </span>
      ))}
    </div>
  )
}

/* ================= 공용 스타일 조각 ================= */

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg shadow-blue-600/25 ring-1 ring-inset ring-white/20 transition-all duration-200 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5'

const DOT_GRID = {
  backgroundImage: 'radial-gradient(circle, rgb(148 163 184 / 0.35) 1px, transparent 1px)',
  backgroundSize: '22px 22px',
} as const

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 ring-1 ring-blue-100 text-blue-700 text-xs font-bold px-3.5 py-1.5">
      {children}
    </span>
  )
}

/* ================= 페이지 ================= */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased overflow-x-clip">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-900/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-b from-blue-500 to-blue-700 shadow-md shadow-blue-600/30 ring-1 ring-inset ring-white/25 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">R</span>
            </div>
            <span className="text-[1.35rem] font-extrabold tracking-tight">Roomly</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-8 text-[0.92rem] font-medium text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">기능</a>
            <a href="#how" className="hover:text-slate-900 transition-colors">시작 방법</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">요금제</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              로그인
            </Link>
            <Link href="/signup" className={`${BTN_PRIMARY} text-sm px-4 py-2`}>
              무료로 시작
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 sm:pt-24 pb-10 px-4 sm:px-6">
        {/* 배경 레이어: 도트 그리드 + 블러 블롭 */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 h-[560px] [mask-image:linear-gradient(to_bottom,black_20%,transparent)]"
            style={DOT_GRID}
          />
          <div className="absolute -top-40 left-1/2 -translate-x-[70%] w-[560px] h-[560px] rounded-full bg-blue-200/40 blur-[120px]" />
          <div className="absolute -top-24 left-1/2 translate-x-[10%] w-[480px] h-[480px] rounded-full bg-sky-100/60 blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-slate-200 shadow-sm text-xs font-bold text-slate-600 px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              호텔 하우스키핑 실시간 관리
            </span>
          </div>
          <h1 className="text-[2.6rem] sm:text-6xl font-extrabold tracking-[-0.03em] leading-[1.12] mb-6">
            호텔 객실 청소,
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 bg-clip-text text-transparent">
              한 화면
            </span>
            에서 실시간으로
          </h1>
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-9 max-w-xl mx-auto">
            어느 방이 끝났는지 전화로 확인하지 마세요.
            배정하는 순간 직원 폰에 알림이 가고, 완료되는 순간 현황판에 나타납니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className={`${BTN_PRIMARY} px-7 py-3.5 text-[0.95rem]`}>
              무료로 시작하기
              <IconArrow className="w-4 h-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 text-slate-700 font-semibold px-7 py-3.5 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm hover:ring-slate-300 hover:shadow transition-all duration-200 text-[0.95rem]"
            >
              어떻게 작동하나요?
            </a>
          </div>
          <p className="mt-6 text-[0.83rem] text-slate-400 font-medium">
            3개월 무료 체험 · 신용카드 불필요 · 직원은 앱 설치 없이 QR로 접속
          </p>
        </div>

        {/* 제품 미리보기 */}
        <div className="relative max-w-4xl mx-auto mt-16 sm:mt-20">
          {/* 뒤 글로우 */}
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-b from-blue-100/80 to-transparent blur-2xl" />

          <div className="rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-[0_24px_60px_-16px_rgb(15_23_42/0.18),0_4px_16px_-8px_rgb(15_23_42/0.1)] overflow-hidden">
            {/* 윈도 바 */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold bg-slate-100 rounded-md px-2.5 py-1">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                roomly.app/dashboard
              </span>
            </div>
            <div className="p-4 sm:p-6">
              {/* 상단 요약 */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm sm:text-base font-extrabold tracking-tight">오늘의 객실 현황</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">7월 12일 (일) · 그랜드서울호텔</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 ring-1 ring-amber-200/60 text-amber-800 px-2.5 py-1 rounded-full">
                    대기 3
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 ring-1 ring-blue-200/60 text-blue-800 px-2.5 py-1 rounded-full">
                    청소 중 3
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 ring-1 ring-emerald-200/60 text-emerald-800 px-2.5 py-1 rounded-full">
                    완료 12
                  </span>
                </div>
              </div>

              {/* 진행률 바 */}
              <div className="mb-5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500">전체 진행률</span>
                  <span className="text-[11px] font-extrabold text-blue-600 tabular-nums">12 / 18 객실</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-500 to-sky-400" />
                </div>
              </div>

              {/* 객실 그리드 */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {MOCK_ROOMS.map((room) => (
                  <RoomCard key={room.no} {...room} />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <StatusLegend />
                <span className="text-[10px] text-slate-300 font-semibold">실시간 동기화 중</span>
              </div>
            </div>
          </div>

          {/* 플로팅: 완료 알림 */}
          <div className="hidden sm:flex absolute -right-6 lg:-right-14 -bottom-7 items-center gap-3 bg-white/90 backdrop-blur rounded-2xl ring-1 ring-slate-900/10 shadow-xl px-4 py-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 shadow-md shadow-emerald-500/30 flex items-center justify-center shrink-0">
              <IconCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold leading-tight tracking-tight">403호 청소 완료</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">김지은 · 방금 전</p>
            </div>
          </div>

          {/* 플로팅: 새 배정 */}
          <div className="hidden lg:flex absolute -left-14 top-16 items-center gap-3 bg-white/90 backdrop-blur rounded-2xl ring-1 ring-slate-900/10 shadow-xl px-4 py-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 shadow-md shadow-blue-600/30 flex items-center justify-center shrink-0 text-white">
              <IconPing className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold leading-tight tracking-tight">502호 배정됨</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">박미란 님에게 알림 전송</p>
            </div>
          </div>
        </div>
      </section>

      {/* 숫자로 보는 Roomly */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 divide-x divide-slate-100 rounded-3xl ring-1 ring-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 shadow-sm">
          {[
            { value: '0번', label: '완료 확인 전화' },
            { value: '5초', label: 'QR 스캔 후 접속까지' },
            { value: '0개', label: '직원이 설치할 앱' },
          ].map((stat) => (
            <div key={stat.label} className="py-8 sm:py-10 px-2 text-center">
              <p className="text-3xl sm:text-[2.6rem] font-extrabold tracking-tight bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-transparent leading-none">
                {stat.value}
              </p>
              <p className="mt-2.5 text-[11px] sm:text-sm text-slate-500 font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 핵심 기능 */}
      <section id="features" className="relative py-16 sm:py-28 px-4 sm:px-6">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-slate-50 to-white" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 sm:mb-20">
            <Eyebrow>핵심 기능</Eyebrow>
            <h2 className="mt-5 text-[1.7rem] sm:text-4xl font-extrabold tracking-tight mb-4">
              필요한 것만, 바로 쓸 수 있게
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">복잡한 설정도, 직원 교육도 필요 없습니다.</p>
          </div>

          <div className="space-y-7">
            {/* 실시간 현황판 */}
            <div className="group grid sm:grid-cols-2 gap-8 sm:gap-12 items-center rounded-3xl bg-white ring-1 ring-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-shadow duration-300 p-7 sm:p-12">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/25 ring-1 ring-inset ring-white/25 flex items-center justify-center mb-6">
                  <IconBoard className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-[1.55rem] font-extrabold tracking-tight mb-3.5">
                  모든 객실이 한 화면에
                </h3>
                <p className="text-sm sm:text-[0.95rem] text-slate-500 leading-[1.75]">
                  대기·청소 중·완료가 색으로 구분되어 층별 진행 상황이 한눈에 들어옵니다.
                  직원이 완료 버튼을 누르는 순간 프런트 화면이 바로 바뀝니다.
                </p>
              </div>
              <div className="rounded-2xl ring-1 ring-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-5 shadow-inner">
                <div className="grid grid-cols-4 gap-2">
                  {MOCK_ROOMS.slice(0, 8).map((room) => (
                    <RoomCard key={room.no} {...room} />
                  ))}
                </div>
                <div className="mt-4">
                  <StatusLegend />
                </div>
              </div>
            </div>

            {/* QR 접속 */}
            <div className="group grid sm:grid-cols-2 gap-8 sm:gap-12 items-center rounded-3xl bg-white ring-1 ring-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-shadow duration-300 p-7 sm:p-12">
              <div className="order-1 sm:order-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/25 ring-1 ring-inset ring-white/25 flex items-center justify-center mb-6">
                  <IconQrScan className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-[1.55rem] font-extrabold tracking-tight mb-3.5">
                  직원은 QR만 찍으면 끝
                </h3>
                <p className="text-sm sm:text-[0.95rem] text-slate-500 leading-[1.75]">
                  앱 설치도, 아이디 만들기도 없습니다. 벽에 붙은 QR을 스캔하면
                  오늘 맡은 객실 목록이 바로 뜹니다. 처음 오신 분도 5초면 시작합니다.
                </p>
              </div>
              <div className="order-2 sm:order-1 relative flex justify-center py-4">
                <div
                  aria-hidden
                  className="absolute inset-0 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,black,transparent)]"
                  style={DOT_GRID}
                />
                <div className="relative w-[11.5rem] rounded-[2rem] bg-slate-900 p-1.5 shadow-2xl shadow-slate-900/25">
                  <div className="rounded-[1.65rem] bg-white overflow-hidden">
                    <div className="bg-slate-900 h-6 flex justify-center items-center">
                      <span className="w-14 h-3 rounded-full bg-black ring-1 ring-slate-700" />
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider mb-2.5">QR 스캔</p>
                      <div className="relative mx-auto w-24 h-24 rounded-xl ring-1 ring-slate-200 p-2 grid grid-cols-6 gap-0.5">
                        {[1,0,1,1,0,1, 0,1,0,0,1,0, 1,0,1,1,0,1, 1,0,1,0,1,1, 0,1,0,1,0,0, 1,1,0,1,1,1].map((on, i) => (
                          <span key={i} className={`rounded-[2px] ${on ? 'bg-slate-900' : 'bg-white'}`} />
                        ))}
                        {/* 스캔 코너 */}
                        <span aria-hidden className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-500 rounded-tl-md" />
                        <span aria-hidden className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-500 rounded-tr-md" />
                        <span aria-hidden className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-500 rounded-bl-md" />
                        <span aria-hidden className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-500 rounded-br-md" />
                      </div>
                      <div className="mt-3.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white text-[10px] font-extrabold rounded-xl py-2.5 shadow-md shadow-blue-600/25">
                        오늘 배정 6개 · 시작하기
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 자동 알림 */}
            <div className="group grid sm:grid-cols-2 gap-8 sm:gap-12 items-center rounded-3xl bg-white ring-1 ring-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-shadow duration-300 p-7 sm:p-12">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/25 ring-1 ring-inset ring-white/25 flex items-center justify-center mb-6">
                  <IconPing className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-[1.55rem] font-extrabold tracking-tight mb-3.5">
                  배정하면 알림이 대신 전합니다
                </h3>
                <p className="text-sm sm:text-[0.95rem] text-slate-500 leading-[1.75]">
                  객실을 배정하는 순간 담당 직원 폰에 알림이 갑니다.
                  전달했는지, 확인했는지 신경 쓸 일이 사라집니다.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { title: '새 배정 · 502호', sub: '체크아웃 완료 — 지금 청소 가능', time: '방금', active: true },
                  { title: '새 배정 · 503호', sub: '오후 2시까지 정비 요청', time: '1분 전', active: false },
                ].map((n) => (
                  <div
                    key={n.title}
                    className={`flex items-start gap-3.5 rounded-2xl px-4 py-3.5 ring-1 ${
                      n.active
                        ? 'bg-white ring-blue-200 shadow-lg shadow-blue-100/80'
                        : 'bg-slate-50/80 ring-slate-200/70'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 shadow-md shadow-blue-600/25 flex items-center justify-center shrink-0 mt-0.5 text-white">
                      <IconPing className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-extrabold tracking-tight truncate">{n.title}</p>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">{n.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 시작 방법 */}
      <section id="how" className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 sm:mb-16">
            <Eyebrow>시작 방법</Eyebrow>
            <h2 className="mt-5 text-[1.7rem] sm:text-4xl font-extrabold tracking-tight mb-4">
              오늘 가입하고, 오늘 바로 씁니다
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">도입 컨설팅이나 설치 기간이 없습니다.</p>
          </div>
          <div className="relative grid sm:grid-cols-3 gap-6">
            {/* 연결선 */}
            <div aria-hidden className="hidden sm:block absolute top-[3.4rem] left-[18%] right-[18%] border-t-2 border-dashed border-slate-200" />
            {[
              { icon: IconRooms, step: '1', title: '객실 등록', desc: '층과 호수를 입력하면 현황판이 자동으로 만들어집니다.' },
              { icon: IconPrint, step: '2', title: 'QR 출력', desc: '직원용 QR을 출력해 사무실 벽에 붙이면 초대 끝.' },
              { icon: IconSend, step: '3', title: '배정 시작', desc: '객실을 배정하면 알림이 가고, 진행 상황이 실시간으로 보입니다.' },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-3xl bg-white ring-1 ring-slate-200/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 p-8 text-center"
              >
                <div className="relative inline-flex mb-6">
                  <div className="w-[4.2rem] h-[4.2rem] rounded-2xl bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-200 shadow-sm flex items-center justify-center text-blue-600">
                    <s.icon className="w-8 h-8" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 text-white text-[11px] font-extrabold flex items-center justify-center shadow-md shadow-blue-600/30 ring-2 ring-white">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight mb-2.5">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 요금제 */}
      <section id="pricing" className="relative py-16 sm:py-28 px-4 sm:px-6">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-slate-50 to-white" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 sm:mb-16">
            <Eyebrow>요금제</Eyebrow>
            <h2 className="mt-5 text-[1.7rem] sm:text-4xl font-extrabold tracking-tight mb-4">
              객실 수에 맞게, 부담 없이
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              모든 요금제 3개월 무료 체험. 신용카드 없이 시작하고 언제든 해지할 수 있습니다.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
            {[
              {
                name: '스타터',
                target: '~50객실 · 소규모 호텔',
                price: '30,000',
                features: ['실시간 현황판', 'QR 직원 접속', '이메일 지원'],
                highlight: false,
              },
              {
                name: '스탠다드',
                target: '~150객실 · 중형 호텔',
                price: '70,000',
                features: ['실시간 현황판', 'QR 직원 접속', '배정 알림', '우선 지원'],
                highlight: true,
              },
              {
                name: '프로',
                target: '무제한 · 대형 호텔/체인',
                price: '150,000',
                features: ['실시간 현황판', 'QR 직원 접속', '배정 알림', '전담 매니저', '맞춤 연동'],
                highlight: false,
              },
            ].map((plan) =>
              plan.highlight ? (
                /* 추천 플랜: 그라디언트 보더 */
                <div
                  key={plan.name}
                  className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-blue-500 via-blue-400 to-sky-300 shadow-xl shadow-blue-600/15"
                >
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-b from-blue-500 to-blue-700 text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-md shadow-blue-600/30 ring-1 ring-inset ring-white/25 whitespace-nowrap">
                    가장 많이 선택
                  </span>
                  <div className="h-full rounded-[calc(1.5rem-1.5px)] bg-white p-8 flex flex-col">
                    <h3 className="text-lg font-extrabold tracking-tight mb-1">{plan.name}</h3>
                    <p className="text-sm text-slate-500 mb-7">{plan.target}</p>
                    <div className="mb-7">
                      <span className="text-[2.6rem] font-extrabold tracking-tight leading-none">{plan.price}</span>
                      <span className="text-slate-400 text-sm ml-1.5 font-medium">원 / 월</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
                          <IconCheckCircle className="w-[1.15rem] h-[1.15rem] text-blue-600 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/signup" className={`${BTN_PRIMARY} py-3 text-sm`}>
                      무료로 시작하기
                    </Link>
                  </div>
                </div>
              ) : (
                <div
                  key={plan.name}
                  className="rounded-3xl bg-white ring-1 ring-slate-200/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-300 p-8 flex flex-col"
                >
                  <h3 className="text-lg font-extrabold tracking-tight mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mb-7">{plan.target}</p>
                  <div className="mb-7">
                    <span className="text-[2.6rem] font-extrabold tracking-tight leading-none">{plan.price}</span>
                    <span className="text-slate-400 text-sm ml-1.5 font-medium">원 / 월</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
                        <IconCheckCircle className="w-[1.15rem] h-[1.15rem] text-slate-400 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className="block text-center font-semibold py-3 rounded-xl text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                  >
                    무료로 시작하기
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-5 text-[1.7rem] sm:text-3xl font-extrabold tracking-tight">자주 묻는 질문</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: '직원이 앱을 설치해야 하나요?',
                a: '아니요. QR을 스캔하면 브라우저에서 바로 열립니다. 설치·회원가입·로그인이 전부 필요 없습니다.',
              },
              {
                q: '무료 체험이 끝나면 자동으로 결제되나요?',
                a: '아니요. 신용카드 없이 시작하기 때문에 체험이 끝나도 자동 결제되지 않습니다. 계속 쓰실 때만 결제를 등록하시면 됩니다.',
              },
              {
                q: '직원들이 나이가 많아도 쓸 수 있을까요?',
                a: '직원 화면은 "내 객실 목록 보기"와 "완료 버튼 누르기" 두 가지가 전부입니다. 별도 교육 없이 바로 쓸 수 있도록 만들었습니다.',
              },
              {
                q: '해지는 어떻게 하나요?',
                a: '설정 화면에서 클릭 한 번으로 해지됩니다. 위약금이나 최소 계약 기간이 없습니다.',
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl bg-white ring-1 ring-slate-200/80 open:ring-slate-300 open:shadow-md open:shadow-slate-200/50 transition-all px-6 py-5"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-sm sm:text-[0.95rem] tracking-tight [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="ml-4 w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center transition-transform duration-200 group-open:rotate-45 shrink-0">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </span>
                </summary>
                <p className="mt-3.5 text-sm text-slate-500 leading-[1.75] pr-10">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="relative max-w-5xl mx-auto rounded-[2rem] bg-slate-950 text-white text-center px-6 py-16 sm:py-24 overflow-hidden ring-1 ring-white/10">
          {/* 배경 텍스처 */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgb(148 163 184 / 0.4) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[380px] rounded-full bg-blue-600/30 blur-[110px]" />
          <div className="relative">
            <h2 className="text-[1.7rem] sm:text-4xl font-extrabold tracking-tight mb-4">
              내일 아침 청소부터 달라집니다
            </h2>
            <p className="text-slate-400 mb-10 text-sm sm:text-base font-medium">
              3개월 무료 체험 · 신용카드 불필요 · 언제든 해지
            </p>
            <Link href="/signup" className={`${BTN_PRIMARY} px-8 py-4 text-base`}>
              무료로 시작하기
              <IconArrow className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-slate-100 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white font-extrabold text-[10px]">R</span>
            </div>
            <span className="font-bold text-slate-600">Roomly</span>
            <span className="ml-1">© 2026</span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <Link href="/terms" className="hover:text-slate-600 transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
