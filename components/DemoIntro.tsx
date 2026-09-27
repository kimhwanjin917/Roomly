'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'

/**
 * 데모로 들어온 사람에게 한 번 보여주는 안내.
 *
 * /api/demo는 관리자 현황판으로 바로 떨어뜨린다. 맥락 없이 표만 보면
 * 이 화면이 무엇을 해결한 것인지 알 수 없다. 그래서 들어오자마자
 * "사람이 하던 일 → 에이전트가 하는 일"과 눌러볼 순서를 먼저 보여준다.
 *
 * 닫으면 이 브라우저에서는 다시 뜨지 않는다.
 */

const SEEN_KEY = 'roomly_demo_intro_seen'

const BEFORE = [
  '체크아웃된 방을 하나씩 확인',
  '현황판에 더티로 표시',
  '누가 한가한지 떠올려 배정',
  '체크인 임박한 방을 먼저 지시',
]

const AFTER = [
  '현황판을 스스로 읽는다',
  '긴급도 · 숙련도 · 층 · 부하를 함께 본다',
  '규칙을 어기면 스스로 되돌린다',
  '배정하고 직원에게 알린다',
]

const STEPS = [
  { n: '1', label: '체크아웃 발생', desc: '완료된 객실 3개가 더티로 바뀝니다' },
  { n: '2', label: '지금 실행', desc: '에이전트가 판단하고 실제로 배정합니다' },
  { n: '3', label: '활동 기록 확인', desc: '무엇을 왜 배정했는지 한 줄씩 남습니다' },
]

export default function DemoIntro() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // /api/demo가 붙여준 ?demo=1 로 들어온 사람에게만 보여준다.
    // useSearchParams 대신 location을 직접 읽는다 — Suspense 경계를 만들 이유가 없다.
    if (!new URLSearchParams(window.location.search).has('demo')) return

    try {
      if (localStorage.getItem(SEEN_KEY) !== '1') setOpen(true)
    } catch {
      // 사생활 보호 모드 등에서 storage가 막히면 그냥 보여준다
      setOpen(true)
    }
  }, [])

  function close() {
    setOpen(false)
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* 저장 못 해도 닫히기만 하면 된다 */ }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, overflowY: 'auto',
      }}
      onClick={close}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surface,
          border: `1px solid ${C.borderHi}`,
          borderRadius: 22,
          width: '100%', maxWidth: 880,
          boxShadow: '0 32px 120px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '34px 38px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: '0.12em', marginBottom: 12 }}>
            ROOMLY 데모
          </p>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', lineHeight: 1.3 }}>
            관리자가 하루 종일 하던 배정 판단을<br />에이전트가 대신합니다
          </h2>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '26px 38px 0' }}
          className="demo-intro-grid"
        >
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', marginBottom: 14 }}>
              사람이 하던 일
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BEFORE.map(t => (
                <li key={t} style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.5, display: 'flex', gap: 9 }}>
                  <span style={{ color: C.textDim, flexShrink: 0 }}>·</span>{t}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.accent}55`, borderRadius: 14, padding: '20px 22px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.accentHi, letterSpacing: '0.1em', marginBottom: 14 }}>
              에이전트가 하는 일
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {AFTER.map(t => (
                <li key={t} style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5, display: 'flex', gap: 9 }}>
                  <span style={{ color: C.green, flexShrink: 0 }}>·</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ padding: '26px 38px 0' }}>
          <p style={{ fontSize: 13, color: C.textMid, marginBottom: 16, lineHeight: 1.6 }}>
            상단 <b style={{ color: C.text }}>에이전트</b> 버튼을 누른 뒤, 아래 순서대로 눌러보세요.
          </p>
          <div style={{ display: 'flex', gap: 12 }} className="demo-intro-steps">
            {STEPS.map(s => (
              <div
                key={s.n}
                style={{
                  flex: 1, background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '16px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 20, height: 20, borderRadius: 999, background: C.accent, color: '#fff',
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {s.n}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.label}</span>
                </div>
                <p style={{ fontSize: 12.5, color: C.textMid, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '26px 38px 32px' }}>
          <button
            onClick={close}
            style={{
              width: '100%', padding: '15px 0', border: 'none', borderRadius: 12,
              background: C.accent, color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            현황판 둘러보기
          </button>
          <p style={{ fontSize: 12, color: C.textDim, textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
            이 데모는 실제 서비스와 같은 코드로 동작합니다. 눌러도 실제 호텔에는 영향이 없습니다.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .demo-intro-grid { grid-template-columns: 1fr !important; }
          .demo-intro-steps { flex-direction: column !important; }
        }
      `}</style>
    </div>
  )
}
