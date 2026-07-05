import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roomly — 호텔 하우스키핑 실시간 관리',
  description:
    '텔레그램 단톡방을 졸업하세요. QR 접속, 실시간 현황판, 배정 알림으로 하우스키핑을 스마트하게 관리하세요.',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Roomly</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
          >
            로그인
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white pt-20 pb-24 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Hotel Housekeeping SaaS
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
            텔레그램 단톡방을<br className="hidden sm:block" /> 졸업하세요
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 mb-10 leading-relaxed">
            호텔 하우스키핑 실시간 관리 — QR 접속, 실시간 현황판, 배정 알림
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold px-8 py-4 rounded-xl shadow-lg shadow-blue-200 transition-colors"
          >
            무료로 시작하기 →
          </Link>
          <p className="mt-4 text-sm text-slate-400">신용카드 없이 3개월 무료 체험</p>
        </div>
      </section>

      {/* 문제 vs 해결 */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-12">
            이런 상황, 익숙하지 않으신가요?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Before */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">BEFORE</span>
                <span className="text-sm font-medium text-red-700">지금까지의 방법</span>
              </div>
              <ul className="space-y-4">
                {[
                  { icon: '💬', text: '카카오톡·텔레그램 단톡방으로 객실 배정' },
                  { icon: '📋', text: '수기 체크리스트 작성 및 종이 보고' },
                  { icon: '📞', text: '완료 확인마다 전화 통화' },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-slate-600 text-sm leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">AFTER</span>
                <span className="text-sm font-medium text-blue-700">Roomly를 쓴 이후</span>
              </div>
              <ul className="space-y-4">
                {[
                  { icon: '📷', text: 'QR 스캔 한 번으로 즉시 접속' },
                  { icon: '🖥️', text: '실시간 현황판에서 모든 객실 상태 확인' },
                  { icon: '🔔', text: '배정 즉시 직원 폰에 자동 알림' },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-slate-600 text-sm leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 핵심 기능 */}
      <section className="py-20 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-4">
            핵심 기능 3가지
          </h2>
          <p className="text-center text-slate-500 mb-14 text-sm sm:text-base">
            복잡한 설정 없이 바로 쓸 수 있습니다
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: '🖥️',
                title: '실시간 현황판',
                desc: '모든 객실 상태를 한눈에. 청소 대기·진행 중·완료를 색상으로 즉시 파악하세요.',
              },
              {
                icon: '📷',
                title: 'QR 직원 접속',
                desc: '링크 없이 QR만 스캔하면 바로 시작. 앱 설치도 계정 생성도 필요 없습니다.',
              },
              {
                icon: '🔔',
                title: '배정 알림',
                desc: '배정 즉시 직원 폰에 알림. 담당 객실을 놓치는 일이 없습니다.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-5">{feature.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 요금제 */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-4">
            투명한 요금제
          </h2>
          <p className="text-center text-slate-500 mb-14 text-sm sm:text-base">
            3개월 무료 체험 후 결정하세요. 언제든 취소 가능합니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* 스타터 */}
            <div className="rounded-2xl border border-slate-200 p-8 flex flex-col">
              <h3 className="text-lg font-bold text-slate-900 mb-1">스타터</h3>
              <p className="text-sm text-slate-500 mb-6">소규모 호텔</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-900">30,000</span>
                <span className="text-slate-500 text-sm ml-1">원 / 월</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {['최대 50객실', '실시간 현황판', 'QR 직원 접속', '이메일 지원'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-blue-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                무료로 시작하기
              </Link>
            </div>

            {/* 스탠다드 (추천) */}
            <div className="rounded-2xl border-2 border-blue-600 p-8 flex flex-col relative shadow-lg shadow-blue-100">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  추천
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">스탠다드</h3>
              <p className="text-sm text-slate-500 mb-6">중형 호텔</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-900">70,000</span>
                <span className="text-slate-500 text-sm ml-1">원 / 월</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {['최대 150객실', '실시간 현황판', 'QR 직원 접속', '배정 알림', '우선 지원'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-blue-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                무료로 시작하기
              </Link>
            </div>

            {/* 프로 */}
            <div className="rounded-2xl border border-slate-200 p-8 flex flex-col">
              <h3 className="text-lg font-bold text-slate-900 mb-1">프로</h3>
              <p className="text-sm text-slate-500 mb-6">대형 호텔 · 체인</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-900">150,000</span>
                <span className="text-slate-500 text-sm ml-1">원 / 월</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {['무제한 객실', '실시간 현황판', 'QR 직원 접속', '배정 알림', '전담 매니저 지원', '맞춤 연동'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-blue-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                무료로 시작하기
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-slate-400">
            모든 요금제에 3개월 무료 체험이 포함됩니다. 신용카드 없이 시작하세요.
          </p>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="py-20 px-4 sm:px-6 bg-blue-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
            지금 무료로 시작하세요
          </h2>
          <p className="text-blue-200 mb-10 text-sm sm:text-base leading-relaxed">
            3개월 무료 체험 · 신용카드 불필요 · 언제든 취소
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 font-bold text-base px-8 py-4 rounded-xl shadow-xl transition-colors"
          >
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-slate-900 text-slate-400 text-center py-8 px-4 text-sm">
        <div className="flex items-center justify-center gap-4 mb-3">
          <Link href="/terms" className="hover:text-white transition-colors">
            이용약관
          </Link>
          <span className="text-slate-700">|</span>
          <Link href="/privacy" className="hover:text-white transition-colors">
            개인정보처리방침
          </Link>
        </div>
        © 2025 Roomly. All rights reserved.
      </footer>
    </div>
  )
}
