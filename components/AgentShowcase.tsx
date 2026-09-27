'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { C } from '@/lib/theme'

/**
 * 랜딩 페이지의 에이전트 섹션.
 *
 * 관리자가 손으로 하던 배정 절차와, 에이전트가 같은 일을 하는 과정을 나란히 놓는다.
 * 오른쪽 재생 위젯은 실제 실행 로그를 그대로 옮긴 것이다 — 서버를 부르지 않고
 * 화면에서만 재생하므로, 데모 호텔 상태가 어떻든 항상 같은 장면을 보여준다.
 */

type StepKind = 'observe' | 'plan' | 'reject' | 'assign' | 'done'

interface Step {
  kind: StepKind
  time: string
  text: string
  /** 이 줄이 뜬 뒤 다음 줄까지의 간격 (ms) */
  hold: number
}

/** 2026-09-26 데모 호텔에서 실제로 기록된 사이클 (검증 거부 줄만 예시로 끼워 넣음) */
const SCRIPT: Step[] = [
  { kind: 'observe', time: '14:43:20', text: '현황판 조회 — 배정 대상 6개 (더티 6, 청소중 5, 완료 34)', hold: 900 },
  { kind: 'observe', time: '14:43:24', text: '직원 6명의 최근 7일 실적 조회', hold: 900 },
  { kind: 'plan',    time: '14:43:29', text: '긴급 4개를 먼저 놓고 배정안 작성', hold: 1000 },
  { kind: 'reject',  time: '14:43:31', text: '검증 거부 — 301호 스위트가 가장 느린 직원에게 배정됨', hold: 1400 },
  { kind: 'plan',    time: '14:43:33', text: '사유를 반영해 다시 작성', hold: 900 },
  { kind: 'assign',  time: '14:43:34', text: '301호 → 이하늘 · 45분 무거운 객실은 평균 가장 빠른 직원(22분)에게', hold: 800 },
  { kind: 'assign',  time: '14:43:36', text: '201호 → 김다정 · 두 번째로 빠른 직원(26분)에게', hold: 800 },
  { kind: 'assign',  time: '14:43:37', text: '105호 → 박서준 · 1층 담당이 바빠 다른 직원에게', hold: 800 },
  { kind: 'assign',  time: '14:43:39', text: '402호 → 김다정 · 4층, 부하 균형 고려', hold: 800 },
  { kind: 'done',    time: '14:43:40', text: '6개 객실 배정 완료 · 직원에게 알림 발송', hold: 2600 },
]

const KIND: Record<StepKind, { label: string; color: string }> = {
  observe: { label: '관찰', color: C.textMid },
  plan:    { label: '계획', color: C.accentHi },
  reject:  { label: '거부', color: C.amber },
  assign:  { label: '배정', color: C.green },
  done:    { label: '완료', color: C.green },
}

/** 관리자가 손으로 하던 절차 */
const MANUAL = [
  '체크아웃된 방을 하나씩 확인한다',
  '현황판(엑셀)에 더티로 표시한다',
  '누가 한가한지 떠올려 배정한다',
  '체크인 임박한 방을 골라 우선 지시한다',
  '단톡방에 올리고, 바뀌면 다시 올린다',
]

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    // IntersectionObserver가 없는 환경에서는 그냥 바로 재생한다
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return }

    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) setSeen(true) },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen])

  return { ref, seen }
}

export default function AgentShowcase() {
  const { ref, seen } = useInView<HTMLDivElement>()
  const [shown, setShown] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  // 화면에 들어오면 한 번 자동 재생
  useEffect(() => { if (seen && shown === 0) setPlaying(true) }, [seen, shown])

  useEffect(() => {
    if (!playing) { stop(); return }

    if (shown >= SCRIPT.length) {
      // 마지막 줄을 잠시 두었다가 처음부터 다시
      timer.current = setTimeout(() => setShown(0), SCRIPT[SCRIPT.length - 1].hold)
      return
    }

    timer.current = setTimeout(
      () => setShown(n => n + 1),
      shown === 0 ? 400 : SCRIPT[shown - 1].hold,
    )
    return stop
  }, [playing, shown, stop])

  // 새 줄이 생기면 아래로 따라간다
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [shown])

  useEffect(() => stop, [stop])

  const btn = {
    padding: '10px 18px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: `1px solid ${C.borderHi}`,
    background: C.card,
    color: C.textMid,
  } as const

  return (
    <section
      id="agent"
      style={{
        padding: '140px 32px',
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 72, maxWidth: 860 }}>
          <p
            className="reveal-clip"
            style={{
              fontSize: 11, fontWeight: 700, color: C.accent,
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 28,
            }}
          >
            AI Agent
          </p>
          <h2
            className="reveal-clip"
            style={{
              fontSize: 'clamp(32px, 5vw, 64px)',
              fontWeight: 900, letterSpacing: '-0.045em',
              lineHeight: 1.05, color: C.text, marginBottom: 28,
            }}
          >
            관리자가 하루 종일 하던 판단을{' '}
            <span
              style={{
                background: `linear-gradient(135deg, ${C.accentHi}, ${C.gold})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              에이전트가 대신합니다
            </span>
          </h2>
          <p
            className="reveal"
            style={{ fontSize: 17, color: C.textMid, lineHeight: 1.8, maxWidth: 640, letterSpacing: '-0.02em' }}
          >
            체크아웃된 방을 찾고, 더티로 바꾸고, 누구에게 맡길지 정하고,
            체크인이 임박한 방을 먼저 처리하라고 지시하는 일.
            Roomly의 에이전트는 이 과정을 5분마다 스스로 돌립니다.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 400px) 1fr',
            gap: 28,
            alignItems: 'stretch',
          }}
          className="agent-grid"
        >
          {/* ── 사람이 하던 절차 ── */}
          <div
            className="reveal-left"
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              padding: '36px 32px',
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', marginBottom: 8 }}>
              BEFORE
            </p>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: C.textMid, marginBottom: 26, letterSpacing: '-0.02em' }}>
              관리자가 손으로 하던 일
            </h3>
            <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {MANUAL.map((line, i) => (
                <li key={line} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      flexShrink: 0, width: 24, height: 24, borderRadius: 999,
                      border: `1px solid ${C.borderHi}`, color: C.textDim,
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 14.5, color: C.textMid, lineHeight: 1.6 }}>{line}</span>
                </li>
              ))}
            </ol>
            <p
              style={{
                marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.border}`,
                fontSize: 13.5, color: C.textDim, lineHeight: 1.7,
              }}
            >
              객실이 50개면 이 판단을 하루에 수십 번 반복합니다.
              한 번 놓치면 손님이 프런트에서 기다립니다.
            </p>
          </div>

          {/* ── 에이전트 재생 ── */}
          <div
            ref={ref}
            className="reveal-right"
            style={{
              background: C.bg,
              border: `1px solid ${C.accent}55`,
              borderRadius: 20,
              padding: '28px 28px 24px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 460,
              boxShadow: `0 0 0 1px ${C.accent}18, 0 24px 80px rgba(0,0,0,0.45)`,
            }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, flexWrap: 'wrap', marginBottom: 20,
              }}
            >
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.accentHi, letterSpacing: '0.1em', marginBottom: 6 }}>
                  AFTER
                </p>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
                  에이전트의 실제 판단 기록
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShown(0); setPlaying(true) }}
                  style={btn}
                  aria-label="처음부터 다시 재생"
                >
                  다시 재생
                </button>
                <button
                  onClick={() => setPlaying(p => !p)}
                  style={{ ...btn, background: playing ? C.card : C.accent, color: playing ? C.textMid : '#fff', borderColor: playing ? C.borderHi : C.accent }}
                >
                  {playing ? '일시정지' : '재생'}
                </button>
              </div>
            </div>

            <div
              ref={logRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {SCRIPT.slice(0, shown).map((s, i) => {
                const k = KIND[s.kind]
                return (
                  <div
                    key={`${s.time}-${i}`}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'flex-start',
                      padding: '11px 12px',
                      borderRadius: 10,
                      background: s.kind === 'reject' ? `${C.amber}12` : 'transparent',
                      border: s.kind === 'reject' ? `1px solid ${C.amber}33` : '1px solid transparent',
                      animation: 'revealUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0, fontSize: 11.5, color: C.textDim,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', paddingTop: 2,
                      }}
                    >
                      {s.time}
                    </span>
                    <span
                      style={{
                        flexShrink: 0, width: 34, fontSize: 11.5, fontWeight: 700,
                        color: k.color, paddingTop: 2,
                      }}
                    >
                      {k.label}
                    </span>
                    <span style={{ fontSize: 14, color: s.kind === 'observe' ? C.textMid : C.text, lineHeight: 1.55 }}>
                      {s.text}
                    </span>
                  </div>
                )
              })}

              {shown === 0 && (
                <p style={{ fontSize: 14, color: C.textDim, padding: '20px 12px' }}>재생을 누르면 판단 과정이 흐릅니다.</p>
              )}
            </div>

            <p
              style={{
                marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}`,
                fontSize: 13, color: C.textDim, lineHeight: 1.7,
              }}
            >
              <span style={{ color: C.amber, fontWeight: 700 }}>거부</span> 줄은 에이전트가 스스로 되돌린 기록입니다.
              규칙을 어긴 배정안은 실행되지 않고, 사유가 모델에게 되돌아가 다시 계획합니다.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .agent-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
