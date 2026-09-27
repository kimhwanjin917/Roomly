'use client'

import { useState, useEffect, useCallback } from 'react'
import { C } from '@/lib/theme'

/**
 * 데모 안내.
 *
 * 처음 들어온 사람은 어느 버튼이 무엇을 하는지 모른다. 그래서 한 단계씩
 * 짚어준다. 지금 눌러야 할 것만 뚫어두고 나머지는 덮어서, 엉뚱한 데를
 * 눌러 길을 잃지 않게 한다.
 *
 * 에이전트 패널은 안내가 알아서 열어준다. 체크아웃과 실행은 직접 눌러야
 * 하는 대목이라 그대로 둔다.
 *
 * 오른쪽 위 X는 영구적이다.
 */

const DISMISS_KEY = 'roomly_demo_tour_dismissed'
const DEMO_KEY = 'roomly_demo_session'

interface Step {
  /** 뚫어둘 요소의 data-tour 값. 없으면 화면 전체를 덮는다 */
  target?: string
  badge: string
  title: string
  body: string
  /** 여기서 무엇을 보게 되는지 */
  watch?: string
  cta: string
  /** 이 단계에 들어올 때 안내가 대신 해주는 일 */
  open?: boolean
}

const STEPS: Step[] = [
  {
    badge: '데모',
    title: '손님이 나갈 때마다\n관리자가 정해야 하는 것들',
    body:
      '어느 방이 비었는지 확인하고, 누구한테 맡길지 정하고, 체크인이 가까운 방을 먼저 하라고 알려주고. ' +
      '객실 50개짜리 호텔이면 하루에 수십 번입니다.',
    watch: '이 판단을 AI 에이전트에게 넘겼습니다. 네 단계로 직접 확인해 보세요.',
    cta: '시작',
  },
  {
    target: 'board',
    badge: '1 / 4',
    title: '지금 객실 상태입니다',
    body:
      '한 줄에 객실 번호, 청소 상태, 담당자, 체크인 시각이 있습니다. ' +
      '빨간 긴급은 손님이 두 시간 안에 오는데 아직 청소가 안 끝난 방입니다.',
    watch: '관리자가 엑셀을 열어 하나씩 맞춰보던 게 이 한 화면입니다.',
    cta: '다음',
  },
  {
    target: 'panel',
    badge: '2 / 4',
    title: '에이전트 패널을 열었습니다',
    body:
      '여기서 에이전트를 돌리고, 무엇을 왜 그렇게 정했는지 확인합니다. ' +
      '평소에는 5분마다 알아서 돌지만 지금은 직접 눌러서 봅니다.',
    cta: '다음',
    open: true,
  },
  {
    target: 'simulate',
    badge: '3 / 4',
    title: '손님을 내보내 보세요',
    body:
      '이 버튼을 누르면 객실 세 개가 비면서 청소 대기로 바뀝니다. 체크인은 90분 뒤로 잡힙니다. ' +
      '방금 손님이 나간 상황을 만드는 겁니다.',
    watch: '누른 뒤 뒤쪽 현황판을 보면 빨간 긴급이 늘어나 있습니다.',
    cta: '눌렀습니다',
    open: true,
  },
  {
    target: 'run',
    badge: '4 / 4',
    title: '이제 에이전트에게 맡겨보세요',
    body:
      '현황판과 직원별 기록을 스스로 읽고, 누구에게 어느 방을 줄지 정해서 실제로 배정합니다. ' +
      '15초쯤 걸립니다.',
    watch:
      '아래에 이유가 한 줄씩 쌓입니다. "45분짜리 스위트는 평균이 가장 빠른 직원(22분)에게" 같은 식으로요. ' +
      '규칙에 어긋난 배정은 스스로 물리고 다시 짭니다.',
    cta: '눌렀습니다',
    open: true,
  },
  {
    target: 'log',
    badge: '끝',
    title: '여기가 보실 곳입니다',
    body:
      '에이전트가 무엇을 보고 어떻게 판단했는지 한 줄씩 남습니다. 노란 줄이 있으면 스스로 물린 배정입니다. ' +
      '관리자가 읽고 어디까지 맡길지 정할 수 있습니다.',
    cta: '닫기',
    open: true,
  },
]

const PAD = 6

export default function DemoTour({ onOpenAgent }: { onOpenAgent?: () => void }) {
  const [step, setStep] = useState<number | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

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
      if (new URLSearchParams(window.location.search).has('demo')) setStep(0)
    }
  }, [])

  const current = step !== null ? STEPS[step] : null

  // 패널이 필요한 단계에서는 안내가 대신 열어둔다.
  // 이미 열려 있으면 아무 일도 없으므로 매번 불러도 된다.
  useEffect(() => {
    if (current?.open) onOpenAgent?.()
  }, [current, onOpenAgent])

  // 뚫어둘 요소의 위치를 따라간다
  useEffect(() => {
    const name = current?.target
    if (!name) { setRect(null); return }

    const measure = () => {
      const el = document.querySelector(`[data-tour="${name}"]`)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    const id = setInterval(measure, 250)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearInterval(id)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [current])

  const dismiss = useCallback(() => {
    setStep(null)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* 닫히기만 하면 된다 */ }
  }, [])

  if (step === null || !current) return null

  const last = step === STEPS.length - 1
  const block: React.CSSProperties = { position: 'fixed', background: 'rgba(0,0,0,0.66)', zIndex: 80 }

  // 카드 위치 — 뚫린 자리를 가리지 않는 쪽에 붙인다
  const W = 400
  const card: React.CSSProperties = { position: 'fixed', zIndex: 82, width: W }
  if (!rect) {
    card.left = '50%'
    card.top = '50%'
    card.transform = 'translate(-50%, -50%)'
    card.width = 520
  } else {
    const below = rect.bottom + 16
    const fitsBelow = below + 340 < window.innerHeight
    card.top = fitsBelow ? below : Math.max(16, rect.top - 356)
    card.left = Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - W - 16))
  }

  return (
    <>
      {/* 지금 눌러야 할 곳만 남기고 덮는다. 네 조각으로 나눠 가운데를 비운다 */}
      {rect ? (
        <>
          <div style={{ ...block, left: 0, top: 0, width: '100%', height: Math.max(0, rect.top - PAD) }} />
          <div style={{ ...block, left: 0, top: rect.bottom + PAD, width: '100%', bottom: 0 }} />
          <div style={{ ...block, left: 0, top: rect.top - PAD, width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2 }} />
          <div style={{ ...block, left: rect.right + PAD, top: rect.top - PAD, right: 0, height: rect.height + PAD * 2 }} />
          <div
            style={{
              position: 'fixed', zIndex: 81, pointerEvents: 'none',
              left: rect.left - PAD, top: rect.top - PAD,
              width: rect.width + PAD * 2, height: rect.height + PAD * 2,
              border: `2px solid ${C.accentHi}`, borderRadius: 12,
              boxShadow: `0 0 26px ${C.accent}99`,
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </>
      ) : (
        <div style={{ ...block, inset: 0 }} />
      )}

      <div
        style={{
          ...card,
          background: C.surface,
          border: `1px solid ${C.borderHi}`,
          borderRadius: 18,
          padding: '24px 26px 20px',
          boxShadow: '0 28px 90px rgba(0,0,0,0.65)',
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
          {current.badge}
        </p>
        <h3
          style={{
            fontSize: rect ? 20 : 27, fontWeight: 800, color: C.text,
            letterSpacing: '-0.025em', lineHeight: 1.4, marginBottom: 12,
            paddingRight: 30, whiteSpace: 'pre-line',
          }}
        >
          {current.title}
        </h3>
        <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.75, marginBottom: current.watch ? 14 : 20 }}>
          {current.body}
        </p>

        {current.watch && (
          <p
            style={{
              fontSize: 13.5, color: C.text, lineHeight: 1.75,
              background: `${C.accent}18`, border: `1px solid ${C.accent}44`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 20,
            }}
          >
            {current.watch}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
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
            {current.cta}
          </button>
        </div>

        <p style={{ fontSize: 11.5, color: C.textDim, textAlign: 'center', marginTop: 12 }}>
          오른쪽 위 X를 누르면 안내가 사라집니다
        </p>
      </div>
    </>
  )
}
