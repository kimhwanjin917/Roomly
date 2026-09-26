'use client'

import { useState, useEffect, useCallback } from 'react'
import { C } from '@/lib/theme'

/**
 * 하우스키핑 에이전트 활동 패널.
 *
 * 에이전트가 무엇을 보고 무엇을 했는지 관리자가 읽을 수 있어야 위임이 성립한다.
 * 특히 검증에서 거부된 계획(kind='reject')을 숨기지 않는다 — 스스로 되돌린
 * 흔적이 보여야 관리자가 어디까지 맡길지 판단할 수 있다.
 */

type LogKind = 'observe' | 'plan' | 'reject' | 'assign' | 'alert' | 'error'

interface AgentLog {
  id: string
  cycle_id: string
  kind: LogKind
  message: string
  created_at: string
}

/** 로그 종류별 표시 — 거부(reject)는 눈에 띄어야 한다 */
const KIND_STYLE: Record<LogKind, { label: string; color: string; icon: string }> = {
  observe: { label: '관찰', color: C.textDim, icon: '◎' },
  plan:    { label: '계획', color: C.textMid, icon: '◇' },
  reject:  { label: '거부', color: C.amber,   icon: '⟲' },
  assign:  { label: '배정', color: C.green,   icon: '✓' },
  alert:   { label: '호출', color: C.violet,  icon: '!' },
  error:   { label: '오류', color: C.red,     icon: '×' },
}

/** 로그 자동 새로고침 주기 (ms) */
const POLL_MS = 15_000

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function AgentPanel({
  onClose,
  onChanged,
  showToast,
}: {
  onClose: () => void
  /** 배정/상태가 바뀌었을 때 현황판을 다시 읽게 한다 */
  onChanged: () => void
  showToast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [enabled, setEnabled] = useState(true)
  const [running, setRunning] = useState(false)
  const [simulating, setSimulating] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agent')
      if (!res.ok) return
      const data = await res.json()
      setLogs(data.logs ?? [])
      setEnabled(data.enabled !== false)
    } catch {
      /* 폴링 실패는 무시 — 다음 주기에 다시 시도한다 */
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  async function run() {
    setRunning(true)
    try {
      const res = await fetch('/api/admin/agent', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.message ?? '에이전트 실행에 실패했습니다.')
        return
      }
      showToast(
        data.assigned > 0
          ? `${data.assigned}개 객실을 배정했습니다.`
          : '배정할 객실이 없습니다.',
        'success',
      )
      await Promise.all([load(), onChanged()])
    } catch {
      showToast('에이전트 실행에 실패했습니다.')
    } finally {
      setRunning(false)
    }
  }

  async function simulateCheckout() {
    setSimulating(true)
    try {
      const res = await fetch('/api/admin/agent/simulate', { method: 'POST' })
      const data = await res.json()
      const rooms: string[] = data.checkedOut ?? []
      if (!rooms.length) {
        showToast(data.note ?? '체크아웃시킬 객실이 없습니다.')
        return
      }
      showToast(`${rooms.join(', ')}호 체크아웃`, 'success')
      await onChanged()
    } catch {
      showToast('체크아웃 시뮬레이션에 실패했습니다.')
    } finally {
      setSimulating(false)
    }
  }

  const btn = {
    padding: '9px 14px',
    borderRadius: 9,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    border: `1px solid ${C.border}`,
  } as const

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 }}
      className="sm:items-center"
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, width: '100%', maxWidth: 560, borderRadius: '20px 20px 0 0', overflow: 'hidden', boxShadow: '0 -24px 80px rgba(0,0,0,0.6)' }}
        className="sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }} className="sm:hidden">
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>하우스키핑 에이전트</h2>
            <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
              5분마다 현황판을 읽고 스스로 배정합니다
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: C.textMid, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 13, height: 13 }}>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {!enabled && (
          <div style={{ padding: '10px 20px', background: 'rgba(251,191,36,0.08)', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 12, color: C.amber }}>
              ANTHROPIC_API_KEY가 설정되지 않아 에이전트가 꺼져 있습니다.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
          <button
            onClick={run}
            disabled={running || !enabled}
            style={{ ...btn, flex: 1, background: C.accent, color: '#fff', borderColor: C.accent, opacity: running || !enabled ? 0.5 : 1 }}
          >
            {running ? '판단 중...' : '지금 실행'}
          </button>
          <button
            onClick={simulateCheckout}
            disabled={simulating}
            style={{ ...btn, background: C.card, color: C.textMid, opacity: simulating ? 0.5 : 1 }}
          >
            {simulating ? '처리 중...' : '체크아웃 발생'}
          </button>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 20px 16px' }}>
          {logs.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textDim, fontSize: 13, padding: '40px 0', lineHeight: 1.6 }}>
              아직 활동 기록이 없습니다.<br />
              &apos;체크아웃 발생&apos;으로 일감을 만든 뒤 &apos;지금 실행&apos;을 눌러보세요.
            </p>
          ) : (
            logs.map(log => {
              const style = KIND_STYLE[log.kind] ?? KIND_STYLE.observe
              return (
                <div
                  key={log.id}
                  style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: `1px solid ${C.border}55` }}
                >
                  <span style={{ color: style.color, fontSize: 13, width: 14, flexShrink: 0, textAlign: 'center' }}>
                    {style.icon}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {log.message}
                    </p>
                    <p style={{ fontSize: 10.5, color: C.textDim, marginTop: 2 }}>
                      {time(log.created_at)} · {style.label}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
