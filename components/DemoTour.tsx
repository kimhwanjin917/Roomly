'use client'

import { useState, useEffect, useCallback } from 'react'
import { C } from '@/lib/theme'

/**
 * 데모 안내 — 게임 튜토리얼처럼 한 단계씩 짚어준다.
 *
 * 처음 보는 사람은 어떤 버튼이 무엇을 하는지, 어디가 볼거리인지 알 수 없다.
 * 그래서 각 단계마다 실제 버튼에 테두리를 씌우고, 그 버튼이 무엇을 하는지와
 * 무엇을 보게 되는지를 옆에 붙여 말한다.
 *
 * 닫기(X)는 영구적이다. 한 번 닫으면 이 브라우저에서는 다시 뜨지 않는다.
 */

const DISMISS_KEY = 'roomly_demo_tour_dismissed'
const DEMO_KEY = 'roomly_demo_session'

interface Step {
  /** 강조할 요소의 data-tour 값. 없으면 화면 가운데 카드만 띄운다 */
  target?: string
  badge: string
  title: string
  body: string
  /** 이 단계에서 무엇이 보이는지 — 와우 포인트 */
  wow?: string
  cta: string
}

const STEPS: Step[] = [
  {
    badge: '들어가기 전에',
    title: '관리자가 하루 종일 하던 판단입니다',
    body:
      '객실 하나가 비면 관리자는 매번 네 가지를 정했습니다. 어느 방이 비었는지, 누구에게 맡길지, ' +
      '어느 방을 먼저 할지, 그걸 어떻게 전달할지. 객실 50개면 하루에 수십 번입니다.',
    wow: 'Roomly는 이 판단을 AI 에이전트에게 넘겼습니다. 4단계로 직접 확인해 보세요.',
    cta: '시작하기',
  },
  {
    target: 'board',
    badge: '1 / 4',
    title: '지금 현장의 상태입니다',
    body:
      '객실마다 청소 상태와 체크인 시각이 한 줄에 있습니다. 빨간 긴급 표시는 체크인이 2시간 안으로 ' +
      '다가왔는데 아직 청소가 끝나지 않은 방입니다.',
    wow: '관리자가 엑셀을 열어 하나씩 맞춰보던 것이 이 한 화면입니다.',
    cta: '다음',
  },
  {
    target: 'agent',
    badge: '2 / 4',
    title: '여기서 에이전트를 엽니다',
    body:
      '이 버튼을 누르면 에이전트 패널이 열립니다. 에이전트가 무엇을 보고 무엇을 결정했는지가 ' +
      '여기에 기록됩니다.',
    wow: '버튼을 눌러 패널을 연 다음 계속 진행하세요.',
    cta: '패널을 열었습니다',
  },
  {
    target: 'simulate',
    badge: '3 / 4',
    title: '체크아웃을 일으켜 봅니다',
    body:
      '완료된 객실 세 개가 더티로 바뀌고, 체크인이 90분 뒤로 잡힙니다. 방금 손님이 나간 상황을 ' +
      '만드는 버튼입니다.',
    wow: '현황판에 빨간 긴급 표시가 늘어나는 것이 보입니다.',
    cta: '다음',
  },
  {
    target: 'run',
    badge: '4 / 4',
    title: '에이전트에게 맡깁니다',
    body:
      '에이전트가 현황판과 직원 실적을 스스로 조회하고, 누구에게 어느 방을 줄지 정해 실제로 ' +
      '배정합니다. 15초쯤 걸립니다.',
    wow:
      '배정 이유가 한 줄씩 쌓입니다 — "45분 무거운 객실은 평균 가장 빠른 직원(22분)에게". ' +
      '규칙을 어긴 계획은 스스로 되돌리고 다시 만듭니다.',
    cta: '해보겠습니다',
  },
]

export default function DemoTour() {
  const [step, setStep] = useState<number | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // 데모로 들어온 브라우저인지 기억해 둔다 — 화면을 옮겨다녀도 안내가 유지된다
  useEffect(() => {
    let isDemo = false
    try {
      if (new URLSearchParams(window.location.search).has('demo')) {
        localStorage.setItem(DEMO_KEY, '1')
        isDemo = true
      } else {
        isDemo = localStorage.getItem(DEMO_KEY) === '1'
      }
      if (isDemo && localStorage.getItem(DISMISS_KEY) !== '1') setStep(0)
    } catch {
      // storage가 막힌 브라우저에서는 이번 방문에만 보여준다
      if (new URLSearchParams(window.location.search).has('demo')) setStep(0)
    }
  }, [])

  const target = step !== null ? STEPS[step].target : undefined

  // 강조할 요소의 위치를 따라다닌다
  useEffect(() => {
    if (!target) { setRect(null); return }

    const measure = () => {
      const el = document.querySelector(`[data-tour="${target}"]`)
      setRect(el ? el.getBoundingClientRect() : null)
    }

    measure()
    const id = setInterval(measure, 400)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearInterval(id)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [target])

  const dismiss = useCallback(() => {
    setStep(null)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* 닫히기만 하면 된다 */ }
  }, [])

  if (step === null) return null

  const s = STEPS[step]
  const last = step === STEPS.length - 1

  // 카드는 강조 요소를 가리지 않는 쪽에 붙인다
  const card: React.CSSProperties = { position: 'fixed', zIndex: 82, width: 420 }
  if (!rect) {
    card.left = '50%'
    card.top = '50%'
    card.transform = 'translate(-50%, -50%)'
    card.width = 540
  } else if (rect.bottom + 300 < window.innerHeight) {
    card.top = rect.bottom + 16
    card.left = Math.min(Math.max(16, rect.left), window.innerWidth - 436)
  } else {
    card.top = Math.max(16, rect.top - 300)
    card.left = Math.min(Math.max(16, rect.left), window.innerWidth - 436)
  }

  return (
    <>
      {/* 강조 테두리 — 아래 요소를 클릭할 수 있도록 통과시킨다 */}
      {rect && (
        <div
          style={{
            position: 'fixed', zIndex: 80, pointerEvents: 'none',
            left: rect.left - 6, top: rect.top - 6,
            width: rect.width + 12, height: rect.height + 12,
            border: `2px solid ${C.accentHi}`, borderRadius: 12,
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.55), 0 0 24px ${C.accent}88`,
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      )}

      {/* 첫 단계는 강조할 대상이 없으므로 화면 전체를 덮는다 */}
      {!rect && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.72)' }} />
      )}

      <div
        style={{
          ...card,
          background: C.surface,
          border: `1px solid ${C.borderHi}`,
          borderRadius: 18,
          padding: '24px 26px 22px',
          boxShadow: '0 28px 90px rgba(0,0,0,0.6)',
        }}
      >
        <button
          onClick={dismiss}
          aria-label="안내 닫기"
          title="안내를 완전히 닫습니다"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, borderRadius: 8,
            background: C.card, border: `1px solid ${C.border}`, color: C.textMid,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12 }}>
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>

        <p style={{ fontSize: 11, fontWeight: 700, color: C.accentHi, letterSpacing: '0.12em', marginBottom: 10 }}>
          {s.badge}
        </p>
        <h3 style={{ fontSize: rect ? 20 : 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', lineHeight: 1.35, marginBottom: 12, paddingRight: 30 }}>
          {s.title}
        </h3>
        <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7, marginBottom: s.wow ? 14 : 20 }}>
          {s.body}
        </p>

        {s.wow && (
          <p
            style={{
              fontSize: 13.5, color: C.text, lineHeight: 1.7,
              background: `${C.accent}18`, border: `1px solid ${C.accent}44`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 20,
            }}
          >
            {s.wow}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'transparent', border: `1px solid ${C.border}`, color: C.textMid,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              이전
            </button>
          )}
          <button
            onClick={() => (last ? dismiss() : setStep(step + 1))}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 10, border: 'none',
              background: C.accent, color: '#fff', fontSize: 14.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {s.cta}
          </button>
        </div>

        <p style={{ fontSize: 11.5, color: C.textDim, textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
          오른쪽 위 X를 누르면 안내가 완전히 사라집니다
        </p>
      </div>
    </>
  )
}
