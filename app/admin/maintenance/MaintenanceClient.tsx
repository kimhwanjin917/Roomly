'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { C } from '@/lib/theme'

type MaintenanceRequest = {
  id: string
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  resolved_at: string | null
  staff: { name: string } | null
  rooms: { number: string; floor: number } | null
}

const STATUS_CONFIG = {
  open:        { label: '접수',  bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  in_progress: { label: '처리중', bg: 'rgba(94,106,210,0.14)',  text: '#818cf8' },
  resolved:    { label: '완료',  bg: 'rgba(52,211,153,0.12)',   text: '#34d399' },
}

export default function MaintenanceClient({ hotelId, initialItems }: { hotelId: string; initialItems: MaintenanceRequest[] }) {
  const [items, setItems] = useState<MaintenanceRequest[]>(initialItems)
  const [filterStatus, setFilterStatus] = useState<string | null>('open')
  const [updating, setUpdating] = useState<string | null>(null)

  async function updateStatus(id: string, status: 'open' | 'in_progress' | 'resolved') {
    setUpdating(id)
    const supabase = createClient()
    await supabase.from('maintenance_requests').update({
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status, resolved_at: status === 'resolved' ? new Date().toISOString() : null } : i))
    setUpdating(null)
  }

  const filtered = filterStatus ? items.filter(i => i.status === filterStatus) : items

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-enter { animation: fadeUp 0.18s ease-out both; }
      `}</style>

      <main className="page-enter md:pb-6" style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>유지보수 관리</h1>
          <span style={{ fontSize: 13, color: C.textMid }}>총 {items.length}건</span>
        </div>

        {/* 필터 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([null, 'open', 'in_progress', 'resolved'] as const).map(s => (
            <button
              key={s ?? 'all'}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                border: `1px solid ${filterStatus === s ? 'transparent' : C.border}`,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                background: filterStatus === s ? C.text : C.card,
                color: filterStatus === s ? C.bg : C.textMid,
              }}
            >
              {s === null ? '전체' : STATUS_CONFIG[s].label}
              {s !== null && ` (${items.filter(i => i.status === s).length})`}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '48px 0', textAlign: 'center', color: C.textDim, fontSize: 13 }}>신고된 유지보수 항목이 없습니다</div>
          )}
          {filtered.map(item => {
            const cfg = STATUS_CONFIG[item.status]
            return (
              <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                      {item.rooms && (
                        <span style={{ fontSize: 11, color: C.textMid }}>{item.rooms.floor}층 {item.rooms.number}호</span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: C.text, lineHeight: 1.6 }}>{item.description}</p>
                    <p style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>
                      {item.staff?.name ?? '—'} · {new Date(item.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    {item.status === 'open' && (
                      <button
                        disabled={updating === item.id}
                        onClick={() => updateStatus(item.id, 'in_progress')}
                        style={{ padding: '6px 12px', background: 'rgba(94,106,210,0.14)', color: '#818cf8', fontSize: 11, fontWeight: 700, border: 'none', borderRadius: 8, cursor: updating === item.id ? 'not-allowed' : 'pointer', opacity: updating === item.id ? 0.4 : 1, fontFamily: 'inherit' }}
                      >처리 시작</button>
                    )}
                    {item.status === 'in_progress' && (
                      <button
                        disabled={updating === item.id}
                        onClick={() => updateStatus(item.id, 'resolved')}
                        style={{ padding: '6px 12px', background: 'rgba(52,211,153,0.12)', color: C.green, fontSize: 11, fontWeight: 700, border: 'none', borderRadius: 8, cursor: updating === item.id ? 'not-allowed' : 'pointer', opacity: updating === item.id ? 0.4 : 1, fontFamily: 'inherit' }}
                      >완료 처리</button>
                    )}
                    {item.status === 'resolved' && (
                      <button
                        disabled={updating === item.id}
                        onClick={() => updateStatus(item.id, 'open')}
                        style={{ padding: '6px 12px', background: C.surface, color: C.textMid, fontSize: 11, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 8, cursor: updating === item.id ? 'not-allowed' : 'pointer', opacity: updating === item.id ? 0.4 : 1, fontFamily: 'inherit' }}
                      >재오픈</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </>
  )
}
