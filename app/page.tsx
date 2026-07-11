import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roomly — 호텔 객실 청소, 한 화면에서 실시간으로',
  description:
    '배정부터 완료 확인까지 전화 없이. QR로 직원이 바로 접속하고, 모든 객실 상태가 실시간 현황판에 나타납니다.',
}

/* ---------- 아이콘 (inline SVG) ---------- */

function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconQr({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M18 18h3v3" />
    </svg>
  )
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
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

/* ---------- 현황판 목업 데이터 ---------- */

type RoomStatus = 'waiting' | 'cleaning' | 'done'

const STATUS_STYLE: Record<RoomStatus, string> = {
  waiting: 'bg-amber-50 text-amber-700 ring-amber-200',
  cleaning: 'bg-blue-50 text-blue-700 ring-blue-200',
  done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

const STATUS_DOT: Record<RoomStatus, string> = {
  waiting: 'bg-amber-400',
  cleaning: 'bg-blue-500',
  done: 'bg-emerald-500',
}

const MOCK_ROOMS: { no: string; status: RoomStatus }[] = [
  { no: '201', status: 'done' }, { no: '202', status: 'done' }, { no: '203', status: 'cleaning' },
  { no: '204', status: 'waiting' }, { no: '205', status: 'done' }, { no: '206', status: 'done' },
  { no: '301', status: 'done' }, { no: '302', status: 'cleaning' }, { no: '303', status: 'done' },
  { no: '304', status: 'done' }, { no: '305', status: 'waiting' }, { no: '306', status: 'done' },
  { no: '401', status: 'waiting' }, { no: '402', status: 'done' }, { no: '403', status: 'done' },
  { no: '404', status: 'cleaning' }, { no: '405', status: 'done' }, { no: '406', status: 'done' },
]

function RoomChip({ no, status }: { no: string; status: RoomStatus }) {
  return (
    <div className={`rounded-lg ring-1 px-2 py-2 sm:px-2.5 sm:py-2.5 flex flex-col items-center gap-1 ${STATUS_STYLE[status]}`}>
      <span className="text-[11px] sm:text-xs font-bold tabular-nums">{no}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
    </div>
  )
}

/* ---------- 페이지 ---------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Roomly</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">기능</a>
            <a href="#how" className="hover:text-slate-900 transition-colors">시작 방법</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">요금제</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              로그인
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              무료로 시작
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 sm:pt-24 pb-8 px-4 sm:px-6">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,#eff6ff_0%,transparent_100%)]"
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.15] mb-6">
            호텔 객실 청소,
            <br />
            <span className="text-blue-600">한 화면</span>에서 실시간으로
          </h1>
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-9 max-w-xl mx-auto">
            어느 방이 끝났는지 전화로 확인하지 마세요.
            <br className="hidden sm:block" />
            배정하는 순간 직원 폰에 알림이 가고, 완료되는 순간 현황판에 나타납니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-colors"
            >
              무료로 시작하기
              <IconArrow className="w-4 h-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 text-slate-700 font-semibold px-7 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              어떻게 작동하나요?
            </a>
          </div>
          <p className="mt-5 text-sm text-slate-400">
            3개월 무료 체험 · 신용카드 불필요 · 직원은 앱 설치 없이 QR로 접속
          </p>
        </div>

        {/* 제품 미리보기 (현황판 목업) */}
        <div className="relative max-w-4xl mx-auto mt-14 sm:mt-16">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden">
            {/* 브라우저 바 */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="ml-3 text-xs text-slate-400 font-medium">roomly.app — 실시간 현황판</span>
            </div>
            <div className="p-4 sm:p-6">
              {/* 상단 요약 */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-5">
                <p className="text-sm sm:text-base font-bold">오늘의 객실 현황</p>
                <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 대기 3
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 청소 중 3
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 완료 12
                  </span>
                </div>
              </div>
              {/* 객실 그리드 */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {MOCK_ROOMS.map((room) => (
                  <RoomChip key={room.no} {...room} />
                ))}
              </div>
            </div>
          </div>

          {/* 플로팅 알림 카드 */}
          <div className="hidden sm:flex absolute -right-4 lg:-right-10 -bottom-6 items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-xl px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <IconCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">403호 청소 완료</p>
              <p className="text-xs text-slate-400 mt-0.5">김지은 · 방금 전</p>
            </div>
          </div>
        </div>
      </section>

      {/* 숫자로 보는 Roomly */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 text-center">
          {[
            { value: '0번', label: '완료 확인 전화' },
            { value: '5초', label: 'QR 스캔 후 접속까지' },
            { value: '0개', label: '직원이 설치할 앱' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-600">{stat.value}</p>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 핵심 기능 */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-sm font-bold text-blue-600 mb-3">핵심 기능</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
              필요한 것만, 바로 쓸 수 있게
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              복잡한 설정도, 직원 교육도 필요 없습니다.
            </p>
          </div>

          <div className="space-y-6">
            {/* 실시간 현황판 */}
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center bg-white rounded-2xl border border-slate-200 p-7 sm:p-10">
              <div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                  <IconGrid className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3">모든 객실이 한 화면에</h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                  대기·청소 중·완료가 색으로 구분되어 층별 진행 상황이 한눈에 들어옵니다.
                  직원이 완료 버튼을 누르는 순간 프런트 화면이 바로 바뀝니다.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="grid grid-cols-4 gap-1.5">
                  {MOCK_ROOMS.slice(0, 8).map((room) => (
                    <RoomChip key={room.no} {...room} />
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3 text-[10px] font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />대기</span>
                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />청소 중</span>
                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />완료</span>
                </div>
              </div>
            </div>

            {/* QR 접속 */}
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center bg-white rounded-2xl border border-slate-200 p-7 sm:p-10">
              <div className="order-1 sm:order-2">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                  <IconQr className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3">직원은 QR만 찍으면 끝</h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                  앱 설치도, 아이디 만들기도 없습니다. 벽에 붙은 QR을 스캔하면
                  오늘 맡은 객실 목록이 바로 뜹니다. 처음 오신 분도 5초면 시작합니다.
                </p>
              </div>
              <div className="order-2 sm:order-1 flex justify-center">
                <div className="w-44 rounded-[1.6rem] border-[6px] border-slate-900 bg-white shadow-xl overflow-hidden">
                  <div className="bg-slate-900 h-5 flex justify-center items-end pb-1">
                    <span className="w-10 h-1 rounded-full bg-slate-700" />
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-[10px] font-bold text-slate-400 mb-2">QR 스캔</p>
                    <div className="mx-auto w-24 h-24 rounded-lg border border-slate-200 p-1.5 grid grid-cols-6 gap-0.5">
                      {[1,0,1,1,0,1, 0,1,0,0,1,0, 1,0,1,1,0,1, 1,0,1,0,1,1, 0,1,0,1,0,0, 1,1,0,1,1,1].map((on, i) => (
                        <span key={i} className={`rounded-[1px] ${on ? 'bg-slate-900' : 'bg-white'}`} />
                      ))}
                    </div>
                    <div className="mt-3 bg-blue-600 text-white text-[10px] font-bold rounded-lg py-2">
                      오늘 배정 6개 · 시작하기
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 자동 알림 */}
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center bg-white rounded-2xl border border-slate-200 p-7 sm:p-10">
              <div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                  <IconBell className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3">배정하면 알림이 대신 전합니다</h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                  객실을 배정하는 순간 담당 직원 폰에 알림이 갑니다.
                  전달했는지, 확인했는지 신경 쓸 일이 사라집니다.
                </p>
              </div>
              <div className="space-y-2.5">
                {[
                  { title: '새 배정 · 502호', sub: '체크아웃 완료 — 지금 청소 가능', time: '방금' },
                  { title: '새 배정 · 503호', sub: '오후 2시까지 정비 요청', time: '1분 전' },
                ].map((n) => (
                  <div key={n.title} className="flex items-start gap-3 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <IconBell className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-bold truncate">{n.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{n.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 시작 방법 */}
      <section id="how" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-blue-600 mb-3">시작 방법</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
              오늘 가입하고, 오늘 바로 씁니다
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">도입 컨설팅이나 설치 기간이 없습니다.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: '객실 등록', desc: '층과 호수를 입력하면 현황판이 자동으로 만들어집니다.' },
              { step: '2', title: 'QR 출력', desc: '직원용 QR을 출력해 사무실 벽에 붙이면 초대 끝.' },
              { step: '3', title: '배정 시작', desc: '객실을 배정하면 알림이 가고, 진행 상황이 실시간으로 보입니다.' },
            ].map((s) => (
              <div key={s.step} className="relative rounded-2xl border border-slate-200 p-7">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-extrabold flex items-center justify-center mb-5">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 요금제 */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-blue-600 mb-3">요금제</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
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
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 flex flex-col bg-white ${
                  plan.highlight
                    ? 'border-2 border-blue-600 shadow-xl shadow-blue-600/10'
                    : 'border border-slate-200'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                    가장 많이 선택
                  </span>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-slate-500 mb-6">{plan.target}</p>
                <div className="mb-7">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="text-slate-400 text-sm ml-1">원 / 월</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <IconCheck className="w-4 h-4 text-blue-600 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block text-center font-semibold py-3 rounded-xl text-sm transition-colors ${
                    plan.highlight
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  무료로 시작하기
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center mb-12">
            자주 묻는 질문
          </h2>
          <div className="divide-y divide-slate-100 border-y border-slate-100">
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
              <details key={item.q} className="group py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-sm sm:text-base">
                  {item.q}
                  <span className="ml-4 text-slate-400 transition-transform group-open:rotate-45 text-xl leading-none shrink-0">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="px-4 sm:px-6 pb-20 sm:pb-24">
        <div className="max-w-5xl mx-auto rounded-3xl bg-slate-900 text-white text-center px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
            내일 아침 청소부터 달라집니다
          </h2>
          <p className="text-slate-400 mb-10 text-sm sm:text-base">
            3개월 무료 체험 · 신용카드 불필요 · 언제든 해지
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-colors"
          >
            무료로 시작하기
            <IconArrow className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-slate-100 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">R</span>
            </div>
            <span className="font-semibold text-slate-600">Roomly</span>
            <span className="ml-1">© 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-slate-600 transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
