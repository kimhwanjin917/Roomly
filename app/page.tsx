import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roomly — 호텔 하우스키핑 실시간 관리',
  description:
    '텔레그램 단톡방을 졸업하세요. QR 접속, 실시간 현황판, 배정 알림으로 하우스키핑을 스마트하게 관리하세요.',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Pretendard', -apple-system, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl" style={{ borderBottom: '1px solid #F2F4F6' }}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#3182F6] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-lg font-bold text-[#191919] tracking-tight">Roomly</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-semibold text-[#6B7684] hover:text-[#191919] transition-colors"
          >
            로그인
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-24 px-5 text-center" style={{ background: 'linear-gradient(180deg, #F2F4F6 0%, #ffffff 100%)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#EBF3FF] text-[#3182F6] text-xs font-bold px-4 py-2 rounded-full mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 bg-[#3182F6] rounded-full" />
            Hotel Housekeeping SaaS
          </div>
          <h1 className="text-[42px] sm:text-[56px] font-extrabold text-[#191919] leading-[1.1] tracking-tight mb-6">
            텔레그램 단톡방을<br />졸업하세요
          </h1>
          <p className="text-lg text-[#6B7684] mb-10 leading-relaxed">
            QR 접속, 실시간 현황판, 배정 알림으로<br className="hidden sm:block" />
            하우스키핑을 스마트하게 관리하세요.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#3182F6] hover:bg-[#1B6EF3] text-white text-base font-bold px-8 py-4 rounded-2xl transition-colors"
            style={{ boxShadow: '0 8px 24px rgba(49,130,246,0.3)' }}
          >
            무료로 시작하기
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
            </svg>
          </Link>
          <p className="mt-4 text-sm text-[#B0B8C1]">신용카드 없이 30일 무료 체험</p>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-[28px] sm:text-[36px] font-extrabold text-[#191919] text-center tracking-tight mb-14">
            이런 상황, 익숙하지 않으신가요?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-3xl p-8" style={{ background: '#FFF5F5', border: '1px solid #FECDD3' }}>
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="text-[10px] font-extrabold bg-[#F04452] text-white px-3 py-1.5 rounded-full tracking-widest">BEFORE</span>
              </div>
              <ul className="space-y-5">
                {[
                  { icon: '💬', text: '카카오톡·텔레그램 단톡방으로 객실 배정' },
                  { icon: '📋', text: '수기 체크리스트 작성 및 종이 보고' },
                  { icon: '📞', text: '완료 확인마다 전화 통화' },
                ].map(item => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[#6B7684] text-sm leading-relaxed font-medium">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl p-8" style={{ background: '#EBF3FF', border: '1px solid #BFDBFE' }}>
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="text-[10px] font-extrabold bg-[#3182F6] text-white px-3 py-1.5 rounded-full tracking-widest">AFTER</span>
              </div>
              <ul className="space-y-5">
                {[
                  { icon: '📷', text: 'QR 스캔 한 번으로 즉시 접속' },
                  { icon: '🖥️', text: '실시간 현황판에서 모든 객실 상태 확인' },
                  { icon: '🔔', text: '배정 즉시 직원 폰에 자동 알림' },
                ].map(item => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[#191919] text-sm leading-relaxed font-medium">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 핵심 기능 */}
      <section className="py-20 px-5" style={{ background: '#F2F4F6' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[28px] sm:text-[36px] font-extrabold text-[#191919] tracking-tight mb-3">
              핵심 기능 3가지
            </h2>
            <p className="text-[#B0B8C1] font-medium">복잡한 설정 없이 바로 쓸 수 있습니다</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                emoji: '🖥️',
                title: '실시간 현황판',
                desc: '모든 객실 상태를 한눈에. 청소 대기·진행 중·완료를 색상으로 즉시 파악하세요.',
              },
              {
                emoji: '📷',
                title: 'QR 직원 접속',
                desc: '링크 없이 QR만 스캔하면 바로 시작. 앱 설치도 계정 생성도 필요 없습니다.',
              },
              {
                emoji: '🔔',
                title: '배정 알림',
                desc: '배정 즉시 직원 폰에 알림. 담당 객실을 놓치는 일이 없습니다.',
              },
            ].map(feature => (
              <div
                key={feature.title}
                className="bg-white rounded-3xl p-7 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-5">{feature.emoji}</div>
                <h3 className="text-base font-extrabold text-[#191919] mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-sm text-[#6B7684] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 요금제 */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[28px] sm:text-[36px] font-extrabold text-[#191919] tracking-tight mb-3">
              투명한 요금제
            </h2>
            <p className="text-[#B0B8C1] font-medium">30일 무료 체험 후 결정하세요. 언제든 취소 가능합니다.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 스타터 */}
            <div className="rounded-3xl p-7 flex flex-col" style={{ border: '1px solid #E8EAED' }}>
              <h3 className="text-base font-extrabold text-[#191919] mb-1">스타터</h3>
              <p className="text-sm text-[#B0B8C1] mb-6">소규모 호텔</p>
              <div className="mb-7">
                <span className="text-[36px] font-extrabold text-[#191919] tracking-tight">30,000</span>
                <span className="text-[#B0B8C1] text-sm ml-1">원 / 월</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['최대 50객실', '실시간 현황판', 'QR 직원 접속', '이메일 지원'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#6B7684] font-medium">
                    <span className="w-4 h-4 bg-[#EBF3FF] rounded-full flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 12 12" fill="#3182F6" className="w-2.5 h-2.5">
                        <path d="M9.707 3.293a1 1 0 0 1 0 1.414L5.414 9 2.293 5.879A1 1 0 0 1 3.707 4.465L5.414 6.172l2.879-2.879a1 1 0 0 1 1.414 0Z" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center py-3.5 rounded-2xl text-sm font-bold text-[#191919] transition-colors"
                style={{ background: '#F2F4F6' }}
              >무료로 시작하기</Link>
            </div>

            {/* 스탠다드 (추천) */}
            <div className="rounded-3xl p-7 flex flex-col relative" style={{ background: '#3182F6', boxShadow: '0 8px 32px rgba(49,130,246,0.3)' }}>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[#191919] text-white text-[10px] font-extrabold px-4 py-2 rounded-full tracking-widest">추천</span>
              </div>
              <h3 className="text-base font-extrabold text-white mb-1">스탠다드</h3>
              <p className="text-sm text-blue-200 mb-6">중형 호텔</p>
              <div className="mb-7">
                <span className="text-[36px] font-extrabold text-white tracking-tight">70,000</span>
                <span className="text-blue-200 text-sm ml-1">원 / 월</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['최대 150객실', '실시간 현황판', 'QR 직원 접속', '배정 알림', '우선 지원'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-blue-100 font-medium">
                    <span className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 12 12" fill="white" className="w-2.5 h-2.5">
                        <path d="M9.707 3.293a1 1 0 0 1 0 1.414L5.414 9 2.293 5.879A1 1 0 0 1 3.707 4.465L5.414 6.172l2.879-2.879a1 1 0 0 1 1.414 0Z" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center py-3.5 bg-white hover:bg-blue-50 text-[#3182F6] rounded-2xl text-sm font-extrabold transition-colors"
              >무료로 시작하기</Link>
            </div>

            {/* 프로 */}
            <div className="rounded-3xl p-7 flex flex-col" style={{ border: '1px solid #E8EAED' }}>
              <h3 className="text-base font-extrabold text-[#191919] mb-1">프로</h3>
              <p className="text-sm text-[#B0B8C1] mb-6">대형 호텔 · 체인</p>
              <div className="mb-7">
                <span className="text-[36px] font-extrabold text-[#191919] tracking-tight">150,000</span>
                <span className="text-[#B0B8C1] text-sm ml-1">원 / 월</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['무제한 객실', '실시간 현황판', 'QR 직원 접속', '배정 알림', '전담 매니저 지원', '맞춤 연동'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#6B7684] font-medium">
                    <span className="w-4 h-4 bg-[#EBF3FF] rounded-full flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 12 12" fill="#3182F6" className="w-2.5 h-2.5">
                        <path d="M9.707 3.293a1 1 0 0 1 0 1.414L5.414 9 2.293 5.879A1 1 0 0 1 3.707 4.465L5.414 6.172l2.879-2.879a1 1 0 0 1 1.414 0Z" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center py-3.5 rounded-2xl text-sm font-bold text-[#191919] transition-colors"
                style={{ background: '#F2F4F6' }}
              >무료로 시작하기</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="py-24 px-5 text-center" style={{ background: '#191919' }}>
        <div className="max-w-lg mx-auto">
          <h2 className="text-[28px] sm:text-[36px] font-extrabold text-white tracking-tight mb-4">
            지금 무료로 시작하세요
          </h2>
          <p className="text-[#6B7684] mb-10 font-medium">
            30일 무료 체험 · 신용카드 불필요 · 언제든 취소
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#3182F6] hover:bg-[#1B6EF3] text-white font-extrabold text-base px-8 py-4 rounded-2xl transition-colors"
            style={{ boxShadow: '0 8px 24px rgba(49,130,246,0.4)' }}
          >
            무료로 시작하기
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="py-8 px-5 text-center" style={{ background: '#111', borderTop: '1px solid #222' }}>
        <p className="text-sm text-[#6B7684]">© 2025 Roomly. All rights reserved.</p>
      </footer>
    </div>
  )
}
