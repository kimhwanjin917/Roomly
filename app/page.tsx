import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roomly — 체크인 지연 없는 호텔 하우스키핑 관리',
  description:
    '객실 배정부터 완료 확인까지, 관리자 폰에서 실시간으로 보입니다. QR 스캔 한 번으로 직원이 접속하고, 카카오톡 단톡방 없이 하우스키핑을 운영하세요.',
}

const C = {
  bg:        '#080809',
  surface:   '#0f1011',
  surfaceHi: '#141516',
  border:    '#1e2024',
  borderHi:  '#2a2d33',
  text:      '#f2f3f4',
  textMid:   '#8a8f98',
  textDim:   '#4a4f58',
  accent:    '#5e6ad2',
  accentHi:  '#6e7ae0',
}

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        fontFamily: "'Inter', 'Pretendard', -apple-system, sans-serif",
        WebkitFontSmoothing: 'antialiased',
        color: C.text,
      }}
    >
      {/* Background grid */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          opacity: 0.4,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Top glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: -200,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(94,106,210,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(8,8,9,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '0 24px',
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                R
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: '-0.02em' }}>
                Roomly
              </span>
            </div>

            {/* Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Link
                href="/login"
                style={{
                  fontSize: 13, fontWeight: 500, color: C.textMid,
                  padding: '6px 12px', borderRadius: 6,
                  textDecoration: 'none', letterSpacing: '-0.01em',
                }}
              >
                로그인
              </Link>
              <Link
                href="/signup"
                style={{
                  fontSize: 13, fontWeight: 600, color: '#fff',
                  padding: '6px 14px', borderRadius: 6,
                  background: C.accent,
                  textDecoration: 'none', letterSpacing: '-0.01em',
                }}
              >
                무료 시작
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section
          style={{
            padding: '120px 24px 96px',
            maxWidth: 1100,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: `1px solid ${C.borderHi}`,
              borderRadius: 999,
              padding: '5px 14px',
              marginBottom: 40,
              fontSize: 12, fontWeight: 500, color: C.textMid,
              letterSpacing: '-0.01em',
            }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: C.accent, flexShrink: 0,
              }}
            />
            Hotel Housekeeping Management
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(40px, 7vw, 72px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: 24,
              background: `linear-gradient(135deg, ${C.text} 0%, ${C.textMid} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            체크인 지연을<br />없애는 가장 빠른 방법
          </h1>

          {/* Sub */}
          <p
            style={{
              fontSize: 17,
              color: C.textMid,
              lineHeight: 1.6,
              marginBottom: 48,
              letterSpacing: '-0.01em',
              maxWidth: 480,
              margin: '0 auto 48px',
            }}
          >
            객실 배정·청소·완료 확인까지 실시간으로.<br />
            카카오톡 단톡방은 이제 필요 없습니다.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/signup"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: 14, fontWeight: 600, color: '#fff',
                padding: '11px 22px', borderRadius: 8,
                background: C.accent,
                textDecoration: 'none', letterSpacing: '-0.01em',
              }}
            >
              무료로 시작하기
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06L9.28 12.53a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href="/login"
              style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: 14, fontWeight: 500, color: C.textMid,
                padding: '11px 22px', borderRadius: 8,
                border: `1px solid ${C.border}`,
                textDecoration: 'none', letterSpacing: '-0.01em',
              }}
            >
              로그인
            </Link>
          </div>

          <p style={{ marginTop: 20, fontSize: 12, color: C.textDim, letterSpacing: '-0.01em' }}>
            3개월 무료 · 신용카드 불필요 · 언제든 취소
          </p>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: '0 auto' }} />

        {/* Features */}
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, textAlign: 'center' }}>
            <p
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: C.accent, marginBottom: 16,
              }}
            >
              Features
            </p>
            <h2
              style={{
                fontSize: 'clamp(24px, 4vw, 40px)',
                fontWeight: 700, letterSpacing: '-0.03em',
                color: C.text, lineHeight: 1.1,
              }}
            >
              복잡한 설정 없이 바로 씁니다
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 1,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 20, height: 20 }}>
                    <rect x="3" y="3" width="8" height="8" rx="1.5" />
                    <rect x="13" y="3" width="8" height="8" rx="1.5" />
                    <rect x="3" y="13" width="8" height="8" rx="1.5" />
                    <rect x="13" y="13" width="8" height="8" rx="1.5" />
                  </svg>
                ),
                title: '실시간 현황판',
                desc: '모든 객실 상태를 한 화면에서. 청소 대기·진행 중·완료를 색상으로 즉시 파악하고, 드래그로 직원에게 배정합니다.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 20, height: 20 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75V16.5ZM16.5 6.75h.75v.75h-.75v-.75Z" />
                  </svg>
                ),
                title: 'QR 직원 접속',
                desc: '링크도 앱도 계정도 필요 없습니다. QR 스캔 한 번으로 직원이 즉시 접속하고, 배정된 객실만 보입니다.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 20, height: 20 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                ),
                title: '배정 즉시 알림',
                desc: '객실을 배정하면 직원 폰에 즉시 알림이 갑니다. 담당 객실을 놓치거나 다시 물어볼 일이 없습니다.',
              },
            ].map((f, i) => (
              <div
                key={f.title}
                style={{
                  padding: '36px 32px',
                  background: C.surface,
                  borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: C.surfaceHi,
                    border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.accent, marginBottom: 20,
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontSize: 15, fontWeight: 600, color: C.text,
                    letterSpacing: '-0.02em', marginBottom: 10,
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.65, letterSpacing: '-0.01em' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: '0 auto' }} />

        {/* Before/After */}
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, textAlign: 'center' }}>
            <p
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: C.accent, marginBottom: 16,
              }}
            >
              Before / After
            </p>
            <h2
              style={{
                fontSize: 'clamp(24px, 4vw, 40px)',
                fontWeight: 700, letterSpacing: '-0.03em',
                color: C.text, lineHeight: 1.1,
              }}
            >
              이런 상황, 익숙하지 않으신가요?
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {/* Before */}
            <div
              style={{
                padding: '28px 28px',
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#f87171',
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  padding: '3px 10px', borderRadius: 4,
                  marginBottom: 24,
                }}
              >
                Before
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  '카카오톡 단톡방으로 객실 배정',
                  '수기 체크리스트, 종이 보고',
                  '완료 확인마다 전화 통화',
                ].map(t => (
                  <li
                    key={t}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="#f87171" strokeWidth={2} style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}>
                      <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                    <span style={{ fontSize: 13, color: C.textMid, letterSpacing: '-0.01em', lineHeight: 1.5 }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div
              style={{
                padding: '28px 28px',
                background: C.surface,
                border: `1px solid ${C.accent}40`,
                borderRadius: 10,
                boxShadow: `0 0 40px rgba(94,106,210,0.08)`,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: C.accent,
                  background: `${C.accent}18`,
                  border: `1px solid ${C.accent}30`,
                  padding: '3px 10px', borderRadius: 4,
                  marginBottom: 24,
                }}
              >
                After
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  'QR 스캔 한 번으로 즉시 접속',
                  '실시간 현황판으로 모든 상태 파악',
                  '배정 즉시 직원 폰에 자동 알림',
                ].map(t => (
                  <li
                    key={t}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                  >
                    <svg viewBox="0 0 16 16" fill={C.accent} style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}>
                      <path fillRule="evenodd" d="M12.707 4.293a1 1 0 0 1 0 1.414L7.414 11 3.293 6.879A1 1 0 0 1 4.707 5.465L7.414 8.172l3.879-3.879a1 1 0 0 1 1.414 0Z" clipRule="evenodd" />
                    </svg>
                    <span style={{ fontSize: 13, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.5 }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: '0 auto' }} />

        {/* Pricing */}
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, textAlign: 'center' }}>
            <p
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: C.accent, marginBottom: 16,
              }}
            >
              Pricing
            </p>
            <h2
              style={{
                fontSize: 'clamp(24px, 4vw, 40px)',
                fontWeight: 700, letterSpacing: '-0.03em',
                color: C.text, lineHeight: 1.1, marginBottom: 12,
              }}
            >
              투명한 요금제
            </h2>
            <p style={{ fontSize: 14, color: C.textMid, letterSpacing: '-0.01em' }}>
              3개월 무료 체험 후 결정하세요. 언제든 취소 가능합니다.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {[
              {
                name: '스타터',
                sub: '소규모 호텔',
                price: '30,000',
                features: ['최대 50객실', '실시간 현황판', 'QR 직원 접속', '이메일 지원'],
                highlight: false,
              },
              {
                name: '스탠다드',
                sub: '중형 호텔',
                price: '70,000',
                features: ['최대 150객실', '실시간 현황판', 'QR 직원 접속', '배정 알림', '우선 지원'],
                highlight: true,
              },
              {
                name: '프로',
                sub: '대형 호텔 · 체인',
                price: '150,000',
                features: ['무제한 객실', '실시간 현황판', 'QR 직원 접속', '배정 알림', '전담 매니저', '맞춤 연동'],
                highlight: false,
              },
            ].map(plan => (
              <div
                key={plan.name}
                style={{
                  padding: '28px',
                  background: plan.highlight ? C.accent : C.surface,
                  border: `1px solid ${plan.highlight ? 'transparent' : C.border}`,
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {plan.highlight && (
                  <span
                    style={{
                      position: 'absolute', top: -1, right: 20,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      background: C.text, color: C.bg,
                      padding: '3px 10px',
                      borderRadius: '0 0 6px 6px',
                    }}
                  >
                    추천
                  </span>
                )}
                <div style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      fontSize: 15, fontWeight: 600,
                      color: plan.highlight ? '#fff' : C.text,
                      letterSpacing: '-0.02em', marginBottom: 4,
                    }}
                  >
                    {plan.name}
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: plan.highlight ? 'rgba(255,255,255,0.6)' : C.textMid,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {plan.sub}
                  </p>
                </div>
                <div style={{ marginBottom: 28 }}>
                  <span
                    style={{
                      fontSize: 36, fontWeight: 700,
                      color: plan.highlight ? '#fff' : C.text,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: plan.highlight ? 'rgba(255,255,255,0.5)' : C.textMid,
                      marginLeft: 4,
                    }}
                  >
                    원 / 월
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: 'none', padding: 0, margin: 0,
                    display: 'flex', flexDirection: 'column', gap: 10,
                    flex: 1, marginBottom: 28,
                  }}
                >
                  {plan.features.map(f => (
                    <li
                      key={f}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill={plan.highlight ? 'rgba(255,255,255,0.9)' : C.accent}
                        style={{ width: 13, height: 13, flexShrink: 0 }}
                      >
                        <path fillRule="evenodd" d="M12.707 4.293a1 1 0 0 1 0 1.414L7.414 11 3.293 6.879A1 1 0 0 1 4.707 5.465L7.414 8.172l3.879-3.879a1 1 0 0 1 1.414 0Z" clipRule="evenodd" />
                      </svg>
                      <span
                        style={{
                          fontSize: 13,
                          color: plan.highlight ? 'rgba(255,255,255,0.85)' : C.textMid,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '10px 0', borderRadius: 6,
                    fontSize: 13, fontWeight: 600,
                    letterSpacing: '-0.01em',
                    textDecoration: 'none',
                    background: plan.highlight ? 'rgba(255,255,255,0.15)' : C.surfaceHi,
                    color: plan.highlight ? '#fff' : C.text,
                    border: `1px solid ${plan.highlight ? 'rgba(255,255,255,0.2)' : C.border}`,
                  }}
                >
                  무료로 시작하기
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: '0 auto' }} />

        {/* Bottom CTA */}
        <section style={{ padding: '96px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2
              style={{
                fontSize: 'clamp(28px, 5vw, 48px)',
                fontWeight: 800, letterSpacing: '-0.04em',
                color: C.text, lineHeight: 1.1, marginBottom: 20,
              }}
            >
              지금 바로 시작하세요
            </h2>
            <p
              style={{
                fontSize: 15, color: C.textMid, marginBottom: 40,
                letterSpacing: '-0.01em', lineHeight: 1.6,
              }}
            >
              3개월 무료 · 신용카드 불필요 · 언제든 취소
            </p>
            <Link
              href="/signup"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: 14, fontWeight: 600, color: '#fff',
                padding: '12px 28px', borderRadius: 8,
                background: C.accent,
                textDecoration: 'none', letterSpacing: '-0.01em',
              }}
            >
              무료로 시작하기
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06L9.28 12.53a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            padding: '24px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: 1100,
            margin: '0 auto',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 18, height: 18, borderRadius: 4,
                background: C.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 9, fontWeight: 700,
              }}
            >
              R
            </span>
            <span style={{ fontSize: 13, color: C.textMid, letterSpacing: '-0.01em' }}>
              Roomly
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link href="/privacy" style={{ fontSize: 12, color: C.textDim, textDecoration: 'none', letterSpacing: '-0.01em' }}>개인정보처리방침</Link>
            <Link href="/terms" style={{ fontSize: 12, color: C.textDim, textDecoration: 'none', letterSpacing: '-0.01em' }}>이용약관</Link>
            <span style={{ fontSize: 12, color: C.textDim }}>© 2025 Roomly</span>
          </div>
        </footer>

      </div>
    </div>
  )
}
