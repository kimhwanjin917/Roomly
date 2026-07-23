'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { C } from '@/lib/theme'
import RoomlyMark from '@/components/RoomlyMark'

/* ── Palette ─────────────────────────────────────────────────── */

/* ══════════════════════════════════════════════════════════════
   Logo mark — 3×2 grid, checkerboard pattern (✓ · ✓ / · ✓ ·)
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   A — Word-by-word reveal (EGEON style)
   gradient/color은 반드시 innermost span에 적용해야 함.
   외부 span에 background-clip:text 쓰면 overflow:hidden 자식이
   background painting을 차단 → 텍스트 투명해지는 버그 발생.
══════════════════════════════════════════════════════════════ */
function WordReveal({
  text,
  startDelay = 1.0,
  wordDelay  = 0.075,
  gradient,
  color = C.text,
}: {
  text:        string
  startDelay?: number
  wordDelay?:  number
  gradient?:   string
  color?:      string
}) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            overflow: 'hidden',
            verticalAlign: 'bottom',
            marginRight: '0.22em',
          }}
        >
          <span style={{
            display: 'inline-block',
            ...(gradient
              ? {
                  background: gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }
              : { color }),
            animation: `revealUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${startDelay + i * wordDelay}s both`,
          }}>
            {word}
          </span>
        </span>
      ))}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   C — Dashboard Mockup (changes with activeFeature)
══════════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    id:   'realtime',
    tag:  'Real-time',
    title:'실시간 현황판',
    desc: '모든 객실 상태를 한 화면에서. 청소 대기·진행 중·완료를 색상으로 즉시 파악하고, 드래그로 직원에게 배정합니다. 체크인 카운트다운까지 함께 보입니다.',
  },
  {
    id:   'qr',
    tag:  'Zero Setup',
    title:'QR 직원 접속',
    desc: '링크도 앱도 계정도 필요 없습니다. QR 스캔 한 번으로 직원이 즉시 접속하고, 배정된 객실만 보입니다. 퇴직 후 QR만 교체하면 접근이 즉시 차단됩니다.',
  },
  {
    id:   'notify',
    tag:  'Instant',
    title:'배정 즉시 알림',
    desc: '객실을 배정하면 직원 폰에 즉시 알림이 갑니다. 완료 보고도 푸시 알림으로 관리자에게 자동 전달됩니다. 전화 한 통도 필요 없습니다.',
  },
]

function QrSvg() {
  return (
    <svg viewBox="0 0 21 21" width="76" height="76">
      {/* TL finder */}
      <rect x="1" y="1" width="7" height="7" fill={C.bg} rx="0.5"/>
      <rect x="2" y="2" width="5" height="5" fill="#fff" rx="0.3"/>
      <rect x="3" y="3" width="3" height="3" fill={C.bg}/>
      {/* TR finder */}
      <rect x="13" y="1" width="7" height="7" fill={C.bg} rx="0.5"/>
      <rect x="14" y="2" width="5" height="5" fill="#fff" rx="0.3"/>
      <rect x="15" y="3" width="3" height="3" fill={C.bg}/>
      {/* BL finder */}
      <rect x="1" y="13" width="7" height="7" fill={C.bg} rx="0.5"/>
      <rect x="2" y="14" width="5" height="5" fill="#fff" rx="0.3"/>
      <rect x="3" y="15" width="3" height="3" fill={C.bg}/>
      {/* Data modules */}
      {([
        [9,1],[11,1],[12,1],[10,2],[9,3],[11,3],[10,4],[12,4],
        [9,6],[10,6],[12,6],[9,8],[11,8],[10,9],[12,9],[9,11],
        [11,11],[13,9],[14,9],[14,11],[15,10],[16,9],[16,11],
        [13,13],[15,13],[14,14],[16,14],[13,15],[15,15],[16,15],
        [13,17],[14,17],[16,17],[15,18],[13,19],[14,19],[15,19],
      ] as [number, number][]).map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={C.bg}/>
      ))}
    </svg>
  )
}

function DashboardMockup({ activeFeature = 0 }: { activeFeature?: number }) {
  const rooms = [
    { id: '101', status: 'done',    name: '김지현' },
    { id: '102', status: 'active',  name: '박민수' },
    { id: '103', status: 'waiting', name: '' },
    { id: '104', status: 'done',    name: '이수연' },
    { id: '105', status: 'active',  name: '최태준' },
    { id: '106', status: 'waiting', name: '' },
    { id: '201', status: 'done',    name: '김지현' },
    { id: '202', status: 'waiting', name: '' },
    { id: '203', status: 'active',  name: '박민수' },
  ]
  const sColor = { done: C.green, active: C.amber, waiting: C.borderAlt }
  const sLabel = { done: '완료', active: '청소 중', waiting: '대기' }
  const trans = 'opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)'

  return (
    <div style={{
      background: C.bgMid,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: `0 48px 120px rgba(0,0,0,0.72)`,
      position: 'relative',
    }}>
      {/* ── Titlebar (항상 표시) ── */}
      <div style={{
        padding: '11px 16px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 7, background: C.surface,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }}/>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }}/>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }}/>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: C.textDim, letterSpacing: '-0.01em' }}>
          Roomly — 실시간 객실 현황
        </span>
      </div>

      {/* ── Feature 0: 대시보드 (베이스, 높이 결정) ── */}
      <div style={{ display: 'flex', gap: 1, borderBottom: `1px solid ${C.border}`, background: C.border }}>
        {[
          { label: '전체', value: '9', color: C.textMid },
          { label: '완료',  value: '4', color: C.green },
          { label: '청소 중', value: '3', color: C.amber },
          { label: '대기',  value: '2', color: C.textDim },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: '13px 8px', background: C.bgMid, textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: C.border, padding: 1 }}>
        {rooms.map(r => (
          <div key={r.id} style={{ background: C.card, padding: '13px 11px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{r.id}호</span>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: sColor[r.status as keyof typeof sColor],
                boxShadow: r.status !== 'waiting' ? `0 0 7px ${sColor[r.status as keyof typeof sColor]}90` : 'none',
              }}/>
            </div>
            <span style={{ fontSize: 10, color: sColor[r.status as keyof typeof sColor], fontWeight: 600 }}>
              {sLabel[r.status as keyof typeof sLabel]}
            </span>
            {r.name && <span style={{ fontSize: 9, color: C.textDim }}>{r.name}</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px solid ${C.border}` }}>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
          <div style={{ width: '55%', height: '100%', background: `linear-gradient(90deg, ${C.green}, ${C.accent})`, borderRadius: 2 }}/>
        </div>
        <span style={{ fontSize: 9, color: C.textMid }}>55%</span>
      </div>

      {/* ── Feature 1 오버레이: QR 직원 접속 ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: C.bgMid,
        opacity: activeFeature === 1 ? 1 : 0,
        transform: activeFeature === 1 ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(8px)',
        transition: trans,
        pointerEvents: activeFeature === 1 ? 'auto' : 'none',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '11px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 7, background: C.surface,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }}/>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }}/>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }}/>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: C.textDim, letterSpacing: '-0.01em' }}>
            Roomly — 직원 QR 접속
          </span>
        </div>
        <div style={{ padding: '24px 24px', flex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: '-0.02em' }}>
              직원 공유용 QR 코드
            </p>
            <p style={{ fontSize: 11, color: C.textDim }}>스캔 한 번으로 즉시 접속 · 앱 설치 불필요</p>
          </div>
          <div style={{
            width: 140, height: 140, margin: '0 auto 20px',
            background: '#fff', borderRadius: 12, padding: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px ${C.accent}28`,
          }}>
            <QrSvg/>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: C.textDim,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
            }}>현재 접속 중인 직원</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { name: '김지현', rooms: '101 · 201호', color: C.green },
                { name: '박민수', rooms: '102 · 203호', color: C.accent },
                { name: '최태준', rooms: '105호',       color: C.amber },
              ].map(s => (
                <div key={s.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 13px', background: C.card, borderRadius: 9,
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}` }}/>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: C.textDim }}>{s.rooms}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature 2 오버레이: 배정 즉시 알림 ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: C.bgMid,
        opacity: activeFeature === 2 ? 1 : 0,
        transform: activeFeature === 2 ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(8px)',
        transition: trans,
        pointerEvents: activeFeature === 2 ? 'auto' : 'none',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '11px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 7, background: C.surface,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }}/>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }}/>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }}/>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: C.textDim, letterSpacing: '-0.01em' }}>
            Roomly — 알림 센터
          </span>
        </div>
        <div style={{ padding: '14px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textMid }}>최근 알림</span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: C.accent,
              background: `${C.accent}18`, border: `1px solid ${C.accent}28`,
              padding: '2px 8px', borderRadius: 4,
            }}>2 unread</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { room: '203호', type: '배정', desc: '지금 바로 청소를 시작하세요',  time: '방금 전', color: C.accent, unread: true },
              { room: '105호', type: '완료', desc: '청소 완료 — 관리자에게 보고됨', time: '3분 전',  color: C.green,  unread: true },
              { room: '302호', type: '배정', desc: '지금 바로 청소를 시작하세요',  time: '8분 전',  color: C.accent, unread: false },
            ].map((n, i) => (
              <div key={i} style={{
                padding: '12px 13px', borderRadius: 10,
                background: n.unread ? C.surface : C.card,
                border: `1px solid ${n.unread ? C.borderAlt : C.border}`,
                opacity: n.unread ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, background: n.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {n.type === '배정'
                      ? <svg viewBox="0 0 16 16" fill="white" style={{ width: 12, height: 12 }}>
                          <path d="M8 1a5 5 0 0 0-5 5v1.5c0 .276-.224.5-.5.5H2a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1h-.5a.5.5 0 0 1-.5-.5V6a5 5 0 0 0-5-5zm0 13a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2z"/>
                        </svg>
                      : <svg viewBox="0 0 16 16" fill="white" style={{ width: 12, height: 12 }}>
                          <path fillRule="evenodd" d="M12.707 4.293a1 1 0 0 1 0 1.414L7.414 11 3.293 6.879A1 1 0 0 1 4.707 5.465L7.414 8.172l3.879-3.879a1 1 0 0 1 1.414 0Z" clipRule="evenodd"/>
                        </svg>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>
                      Roomly <span style={{ color: n.color }}>{n.type}</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim }}>{n.time}</div>
                  </div>
                  {n.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.color, boxShadow: `0 0 7px ${n.color}`, flexShrink: 0 }}/>}
                </div>
                <p style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5, margin: 0 }}>
                  <strong style={{ color: C.text }}>{n.room}</strong>
                  {n.type === '배정' ? '가 배정되었습니다.' : ' 청소가 완료되었습니다.'}<br/>
                  <span style={{ fontSize: 11, color: C.textDim }}>{n.desc}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   C — Features Section (각 피처마다 텍스트 + 목업 나란히)
══════════════════════════════════════════════════════════════ */
function StickyFeatures() {
  return (
    <section id="features" style={{ padding: '140px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Section heading */}
      <div style={{ textAlign: 'center', marginBottom: 100 }}>
        <p className="reveal-clip" style={{
          fontSize: 11, fontWeight: 700, color: C.accent,
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16,
        }}>Features</p>
        <h2 className="reveal-clip" style={{
          fontSize: 'clamp(28px, 4.5vw, 60px)',
          fontWeight: 900, letterSpacing: '-0.048em',
          color: C.text, lineHeight: 1.0,
          transitionDelay: '0.1s',
        }}>
          복잡한 설정 없이<br/>바로 씁니다
        </h2>
      </div>

      {/* Feature rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 120 }}>
        {FEATURES.map((f, i) => (
          <div
            key={f.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 64,
              alignItems: 'center',
            }}
          >
            {/* Text — wipe in from left */}
            <div className="reveal-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: C.accent,
                  background: `${C.accent}14`, border: `1px solid ${C.accent}28`,
                  padding: '4px 12px', borderRadius: 4,
                }}>{f.tag}</span>
                <span style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
                  0{i + 1} / 0{FEATURES.length}
                </span>
              </div>
              <h3 style={{
                fontSize: 'clamp(30px, 3.8vw, 52px)',
                fontWeight: 900, letterSpacing: '-0.045em',
                color: C.text, marginBottom: 20, lineHeight: 1.0,
              }}>
                {f.title}
              </h3>
              <p style={{
                fontSize: 16, color: C.textMid,
                lineHeight: 1.8, letterSpacing: '-0.015em',
                maxWidth: 420,
              }}>
                {f.desc}
              </p>
            </div>

            {/* Mockup — wipe in from right, 0.15s stagger */}
            <div className="reveal-right reveal-stagger">
              <div style={{ transform: 'perspective(1400px) rotateY(-5deg) rotateX(2deg)' }}>
                <DashboardMockup activeFeature={i}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  /* B — observe all clip/fade reveal elements */
  useEffect(() => {
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const selectors = '.reveal, .reveal-clip, .reveal-left, .reveal-right'
    const els = Array.from(document.querySelectorAll(selectors))

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
      },
      { threshold: 0 },
    )
    els.forEach(el => obs.observe(el))

    // fallback: 페이지 어딘가에서 observer가 실패해도 4초 후 전부 보이게
    const fallback = setTimeout(() => {
      els.forEach(el => el.classList.add('visible'))
    }, 4000)

    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [])

  const ticker = [
    '실시간 객실 현황', '·', 'QR 직원 접속', '·', '체크인 지연 제로',
    '·', '배정 즉시 알림', '·', '단톡방 대체', '·', '하우스키핑 디지털화', '·',
    '실시간 객실 현황', '·', 'QR 직원 접속', '·', '체크인 지연 제로',
    '·', '배정 즉시 알림', '·', '단톡방 대체', '·', '하우스키핑 디지털화', '·',
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: "'Inter', 'Pretendard', -apple-system, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      color: C.text,
      overflowX: 'hidden',
    }}>

      {/* ── Film grain ──────────────────────────────────── */}
      <svg width="0" height="0" style={{ position: 'fixed', zIndex: -1 }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feBlend in="SourceGraphic" mode="multiply" result="b"/>
          <feComposite in="b" in2="SourceGraphic" operator="in"/>
        </filter>
      </svg>
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none',
        filter: 'url(#grain)', opacity: 0.032, background: '#fff',
      }}/>

      {/* ── Letterbox bars (cinematic open) ─────────────── */}
      <div aria-hidden style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90, pointerEvents: 'none',
        height: 90, background: '#000', transformOrigin: 'top',
        animation: 'letterboxClose 0.9s cubic-bezier(0.76, 0, 0.24, 1) 0.1s forwards',
      }}/>
      <div aria-hidden style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90, pointerEvents: 'none',
        height: 90, background: '#000', transformOrigin: 'bottom',
        animation: 'letterboxClose 0.9s cubic-bezier(0.76, 0, 0.24, 1) 0.1s forwards',
      }}/>

      {/* ── Ambient glows ───────────────────────────────── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="motion-loop" style={{
          position: 'absolute', top: -250, left: '28%',
          width: 1000, height: 700, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${C.accent}1a 0%, transparent 65%)`,
          animation: 'glowPulse 7s ease-in-out infinite',
        }}/>
        <div style={{
          position: 'absolute', top: '55%', right: -150,
          width: 600, height: 600, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${C.gold}0d 0%, transparent 65%)`,
        }}/>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ════ HEADER ════ */}
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80,
          background: `rgba(11,18,21,0.72)`,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderBottom: `1px solid ${C.border}`,
          animation: 'fadeIn 0.5s ease 0.7s both',
        }}>
          <div style={{
            maxWidth: 1200, margin: '0 auto', padding: '0 32px',
            height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <RoomlyMark size={24}/>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>
                Roomly
              </span>
            </div>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <a href="/api/demo" style={{
                fontSize: 13, fontWeight: 500, color: C.textMid,
                padding: '7px 14px', borderRadius: 8, textDecoration: 'none', letterSpacing: '-0.02em',
              }}>데모 체험하기</a>
              <Link href="/login" style={{
                fontSize: 13, fontWeight: 500, color: C.textMid,
                padding: '7px 14px', borderRadius: 8, textDecoration: 'none', letterSpacing: '-0.02em',
              }}>로그인</Link>
              <Link href="/signup" style={{
                fontSize: 13, fontWeight: 600, color: '#fff',
                padding: '7px 18px', borderRadius: 8, background: C.accent,
                textDecoration: 'none', letterSpacing: '-0.02em',
                boxShadow: `0 0 24px ${C.accent}50`,
              }}>호텔 등록</Link>
            </nav>
          </div>
        </header>

        {/* ════ HERO ════ */}
        <section style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '140px 32px 100px', textAlign: 'center',
          position: 'relative',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: `1px solid ${C.border}`, borderRadius: 999,
            padding: '6px 16px', marginBottom: 52,
            fontSize: 11, fontWeight: 600, color: C.textMid,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            animation: 'fadeIn 0.6s ease 0.95s both',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }}/>
            하우스키핑 디지털화 · 무료 체험 중
          </div>

          {/* A — Word-by-word headline */}
          <h1 style={{
            fontSize: 'clamp(48px, 9vw, 124px)',
            fontWeight: 900, letterSpacing: '-0.055em',
            lineHeight: 0.92, marginBottom: 44,
          }}>
            <div style={{ marginBottom: '0.06em' }}>
              <WordReveal
                text="체크인 지연을"
                startDelay={0.55}
                gradient={`linear-gradient(160deg, ${C.text} 40%, ${C.textMid} 100%)`}
              />
            </div>
            <div style={{ marginBottom: '0.06em' }}>
              <WordReveal
                text="없애는"
                startDelay={0.72}
                wordDelay={0.07}
                gradient={`linear-gradient(135deg, ${C.accentHi} 30%, ${C.gold} 100%)`}
              />
            </div>
            <div>
              <WordReveal
                text="가장 빠른 방법"
                startDelay={0.85}
                gradient={`linear-gradient(160deg, ${C.text} 40%, ${C.textMid} 100%)`}
              />
            </div>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 18px)',
            color: C.textMid, lineHeight: 1.75, maxWidth: 460,
            margin: '0 auto 56px', letterSpacing: '-0.02em',
            animation: 'fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.0s both',
          }}>
            객실 배정·청소·완료 확인까지 실시간으로.<br/>
            단톡방은 이제 필요 없습니다.
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, flexWrap: 'wrap',
            animation: 'fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.15s both',
          }}>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              fontSize: 14, fontWeight: 700, color: '#fff',
              padding: '14px 28px', borderRadius: 10, background: C.accent,
              textDecoration: 'none', letterSpacing: '-0.02em',
              boxShadow: `0 0 44px ${C.accent}55, 0 8px 32px rgba(0,0,0,0.4)`,
            }}>
              호텔 등록하기
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06L9.28 12.53a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd"/>
              </svg>
            </Link>
            <a href="/api/demo" style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 14, fontWeight: 500, color: C.textMid,
              padding: '14px 24px', borderRadius: 10,
              border: `1px solid ${C.border}`,
              textDecoration: 'none', letterSpacing: '-0.02em',
            }}>
              데모 체험하기
            </a>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 14, fontWeight: 500, color: C.textMid,
              padding: '14px 24px', borderRadius: 10,
              border: `1px solid ${C.border}`,
              textDecoration: 'none', letterSpacing: '-0.02em',
            }}>
              로그인하기
            </Link>
          </div>

          <p style={{
            marginTop: 24, fontSize: 12, color: C.textDim,
            animation: 'fadeIn 0.5s ease 1.3s both',
          }}>
            3개월 무료 · 신용카드 불필요 · 언제든 취소
          </p>

          {/* Scroll indicator */}
          <div style={{
            position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            animation: 'fadeIn 0.5s ease 1.4s both',
          }}>
            <span style={{ fontSize: 9, color: C.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>스크롤</span>
            <svg className="motion-loop" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth={1.5}
              style={{ width: 17, height: 17, animation: 'scrollBounce 2s ease-in-out infinite' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </section>

        {/* ════ TICKER ════ */}
        <div style={{
          overflow: 'hidden',
          borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
          padding: '16px 0', background: C.surface,
        }}>
          <div className="ticker-track" style={{
            display: 'flex', gap: 40, width: 'max-content',
            animation: 'marquee 90s linear infinite',
          }}>
            {[...ticker, ...ticker].map((item, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 500,
                color: item === '·' ? C.textDim : C.textMid,
                letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>{item}</span>
            ))}
          </div>
        </div>

        {/* ════ STATEMENT ════ */}
        <section style={{ padding: '160px 32px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ maxWidth: 920 }}>
            <p className="reveal-clip" style={{
              fontSize: 11, fontWeight: 700, color: C.accent,
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 36,
            }}>Why Roomly</p>
            <h2 className="reveal-clip" style={{
              fontSize: 'clamp(38px, 6.5vw, 88px)',
              fontWeight: 900, letterSpacing: '-0.048em',
              lineHeight: 0.96, color: C.text, marginBottom: 44,
            }}>
              호텔 운영에서<br/>
              가장 많이 낭비되는 건<br/>
              <span style={{
                background: `linear-gradient(135deg, ${C.accentHi}, ${C.gold})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>커뮤니케이션 시간</span>입니다
            </h2>
            <p className="reveal" style={{
              fontSize: 18, color: C.textMid, lineHeight: 1.8,
              maxWidth: 560, letterSpacing: '-0.02em',
            }}>
              아직도 단톡방으로 객실을 배정하고 있나요?
              수기 체크리스트, 수없는 전화 통화, 놓치는 완료 보고.
              Roomly는 그 모든 비효율을 실시간 디지털 현황판 하나로 해결합니다.
            </p>
          </div>
        </section>

        {/* ════ C — STICKY FEATURES ════ */}
        <StickyFeatures/>

        {/* ════ STATS ════ */}
        <section style={{
          padding: '140px 32px',
          background: C.surface,
          borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <p className="reveal-clip" style={{
                fontSize: 11, fontWeight: 700, color: C.accent,
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16,
              }}>Numbers</p>
              <h2 className="reveal-clip" style={{
                fontSize: 'clamp(28px, 4vw, 52px)',
                fontWeight: 900, letterSpacing: '-0.045em', color: C.text,
                transitionDelay: '0.12s',
              }}>숫자가 증명합니다</h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden',
              gap: 1, background: C.border,
            }}>
              {[
                { num: '3분',  label: '평균 도입 시간', sub: '설정부터 운영까지', grad: `linear-gradient(135deg, #ffffff 0%, ${C.green} 100%)` },
                { num: '0원',  label: '도입 비용',      sub: '3개월 완전 무료',   grad: `linear-gradient(135deg, #ffffff 0%, ${C.gold} 100%)` },
                { num: '0개',  label: '필요한 앱',       sub: '설치 없이 QR 스캔',  grad: `linear-gradient(135deg, ${C.accentHi} 0%, ${C.gold} 100%)` },
                { num: '무제한', label: '직원 접속',    sub: '인원 제한 없음',    grad: `linear-gradient(135deg, #ffffff 0%, ${C.accentHi} 100%)` },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={`reveal-clip reveal-delay-${i}`}
                  style={{ padding: '52px 28px', background: C.card, textAlign: 'center' }}
                >
                  <div style={{
                    fontSize: 'clamp(44px, 5.5vw, 68px)',
                    fontWeight: 900, letterSpacing: '-0.04em',
                    background: s.grad,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    marginBottom: 10,
                  }}>{s.num}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textMid, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: C.textDim }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════ BEFORE / AFTER ════ */}
        <section style={{
          padding: '140px 32px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <p className="reveal-clip" style={{
                fontSize: 11, fontWeight: 700, color: C.accent,
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16,
              }}>Before / After</p>
              <h2 className="reveal-clip" style={{
                fontSize: 'clamp(28px, 4.5vw, 60px)',
                fontWeight: 900, letterSpacing: '-0.048em', color: C.text, lineHeight: 1.0,
                transitionDelay: '0.1s',
              }}>이런 상황,<br/>익숙하지 않으신가요?</h2>
            </div>

            {/* B — alternating clip-path wipe */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
              {/* Before — wipe left→right */}
              <div className="reveal-left" style={{
                padding: '52px', background: C.card,
                border: `1px solid ${C.border}`, borderRadius: 16,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#f87171', background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.16)',
                  padding: '5px 14px', borderRadius: 6, marginBottom: 36,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171' }}/>
                  Before
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                    '단톡방으로 객실 배정',
                    '수기 체크리스트, 종이 보고',
                    '완료 확인마다 전화 통화',
                    '어떤 객실이 끝났는지 파악 불가',
                  ].map(t => (
                    <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="#f87171" strokeWidth={2}
                        style={{ width: 14, height: 14, flexShrink: 0, marginTop: 3 }}>
                        <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8"/>
                      </svg>
                      <span style={{ fontSize: 14, color: C.textMid, lineHeight: 1.65 }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* After — wipe right→left */}
              <div className="reveal-right" style={{
                padding: '52px', background: C.card,
                border: `1px solid ${C.accent}38`, borderRadius: 16,
                boxShadow: `0 0 64px ${C.accent}0e`,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: C.accent, background: `${C.accent}11`,
                  border: `1px solid ${C.accent}24`,
                  padding: '5px 14px', borderRadius: 6, marginBottom: 36,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 7px ${C.green}` }}/>
                  After Roomly
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                    'QR 스캔 한 번으로 즉시 접속',
                    '실시간 현황판으로 모든 상태 파악',
                    '배정 즉시 직원 폰에 자동 알림',
                    '완료 순간 관리자에게 즉시 보고',
                  ].map(t => (
                    <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <svg viewBox="0 0 16 16" fill={C.green} style={{ width: 14, height: 14, flexShrink: 0, marginTop: 3 }}>
                        <path fillRule="evenodd" d="M12.707 4.293a1 1 0 0 1 0 1.414L7.414 11 3.293 6.879A1 1 0 0 1 4.707 5.465L7.414 8.172l3.879-3.879a1 1 0 0 1 1.414 0Z" clipRule="evenodd"/>
                      </svg>
                      <span style={{ fontSize: 14, color: C.text, lineHeight: 1.65 }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ════ PRICING ════ */}
        <section id="pricing" style={{ padding: '140px 32px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <p className="reveal-clip" style={{
              fontSize: 11, fontWeight: 700, color: C.accent,
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16,
            }}>Pricing</p>
            <h2 className="reveal-clip" style={{
              fontSize: 'clamp(28px, 4.5vw, 60px)',
              fontWeight: 900, letterSpacing: '-0.048em', color: C.text,
              marginBottom: 16, lineHeight: 1.0, transitionDelay: '0.1s',
            }}>투명한 요금제</h2>
            <p className="reveal" style={{ fontSize: 16, color: C.textMid }}>
              3개월 무료 체험 후 결정하세요. 언제든 취소 가능합니다.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {[
              { name: '스타터',   sub: '소규모 호텔',     price: '30,000', highlight: false,
                features: ['최대 50객실', '실시간 현황판', 'QR 직원 접속', '이메일 지원'] },
              { name: '스탠다드', sub: '중형 호텔',        price: '70,000', highlight: true,
                features: ['최대 150객실', '실시간 현황판', 'QR 직원 접속', '배정 알림', '우선 지원'] },
              { name: '프로',     sub: '대형 호텔 · 체인', price: '150,000', highlight: false,
                features: ['무제한 객실', '실시간 현황판', 'QR 직원 접속', '배정 알림', '전담 매니저'] },
            ].map((plan, i) => (
              <div
                key={plan.name}
                className={`reveal-clip reveal-delay-${i}`}
                style={{
                  padding: '40px 32px',
                  background: plan.highlight ? C.accent : C.card,
                  border: `1px solid ${plan.highlight ? 'transparent' : C.border}`,
                  borderRadius: 16, display: 'flex', flexDirection: 'column',
                  position: 'relative',
                  boxShadow: plan.highlight ? `0 0 64px ${C.accent}44, 0 24px 64px rgba(0,0,0,0.45)` : 'none',
                }}
              >
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: C.gold, color: '#000',
                    padding: '4px 16px', borderRadius: '0 0 8px 8px',
                  }}>추천</div>
                )}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: plan.highlight ? '#fff' : C.text, marginBottom: 6 }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.55)' : C.textMid }}>{plan.sub}</p>
                </div>
                <div style={{ marginBottom: 32 }}>
                  <span style={{ fontSize: 44, fontWeight: 900, color: plan.highlight ? '#fff' : C.text, letterSpacing: '-0.04em' }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.45)' : C.textMid, marginLeft: 6 }}>원 / 월</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg viewBox="0 0 16 16" fill={plan.highlight ? 'rgba(255,255,255,0.8)' : C.accent} style={{ width: 13, height: 13, flexShrink: 0 }}>
                        <path fillRule="evenodd" d="M12.707 4.293a1 1 0 0 1 0 1.414L7.414 11 3.293 6.879A1 1 0 0 1 4.707 5.465L7.414 8.172l3.879-3.879a1 1 0 0 1 1.414 0Z" clipRule="evenodd"/>
                      </svg>
                      <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.8)' : C.textMid }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" style={{
                  display: 'block', textAlign: 'center', padding: '12px 0', borderRadius: 10,
                  fontSize: 13, fontWeight: 700, textDecoration: 'none',
                  background: plan.highlight ? 'rgba(255,255,255,0.18)' : C.surface,
                  color: plan.highlight ? '#fff' : C.text,
                  border: `1px solid ${plan.highlight ? 'rgba(255,255,255,0.2)' : C.border}`,
                }}>호텔 등록하기</Link>
              </div>
            ))}
          </div>
        </section>

        {/* ════ FOOTER ════ */}
        <footer style={{ borderTop: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 32px 32px' }}>
            {/* 상단: 로고 + 컬럼 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '48px 80px', marginBottom: 48, flexWrap: 'wrap' }}>
              {/* 브랜드 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <RoomlyMark size={22}/>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>Roomly</span>
                </div>
                <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.7, maxWidth: 240 }}>
                  호텔 하우스키핑을 실시간으로.<br/>단톡방 없이 운영하는 가장 빠른 방법.
                </p>
              </div>

              {/* 제품 */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.textMid, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>제품</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Link href="/#features" style={{ fontSize: 13, color: C.textDim, textDecoration: 'none' }}>기능 소개</Link>
                  <Link href="/#pricing" style={{ fontSize: 13, color: C.textDim, textDecoration: 'none' }}>요금제</Link>
                </div>
              </div>

              {/* 지원 */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.textMid, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>지원</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Link href="/contact" style={{ fontSize: 13, color: C.textDim, textDecoration: 'none' }}>문의하기</Link>
                  <Link href="/terms" style={{ fontSize: 13, color: C.textDim, textDecoration: 'none' }}>이용약관</Link>
                  <Link href="/privacy" style={{ fontSize: 13, color: C.textDim, textDecoration: 'none' }}>개인정보처리방침</Link>
                </div>
              </div>
            </div>

            {/* 하단: 저작권 */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
              <span style={{ fontSize: 12, color: C.textDim }}>© 2026 Roomly. All rights reserved.</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
