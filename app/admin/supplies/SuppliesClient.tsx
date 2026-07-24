'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { C } from '@/lib/theme'

const inputSt: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 10, fontSize: 13, color: C.text,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20,
}
const modalBox: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`,
  width: '100%', maxWidth: 420,
  borderRadius: '20px 20px 0 0',
  boxShadow: '0 -24px 80px rgba(0,0,0,0.6)',
  overflow: 'hidden',
}

type Supply = {
  id: string
  name: string
  unit: string
  stock: number
  low_stock: number
}

type Request = {
  id: string
  supply_id: string
  qty: number
  note: string | null
  status: 'pending' | 'fulfilled'
  requested_at: string
  staff: { name: string } | null
  rooms: { number: string } | null
  supplies: { name: string; unit: string } | null
}

export default function SuppliesClient({
  hotelId,
  initialSupplies,
  initialRequests,
}: {
  hotelId: string
  initialSupplies: Supply[]
  initialRequests: Request[]
}) {
  const [supplies, setSupplies] = useState<Supply[]>(initialSupplies)
  const [requests, setRequests] = useState<Request[]>(initialRequests)
  const [tab, setTab] = useState<'stock' | 'requests'>('requests')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', unit: '개', stock: '0', low_stock: '5' })
  const [saving, setSaving] = useState(false)

  async function addSupply() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('supplies').insert({
      hotel_id: hotelId,
      name: form.name,
      unit: form.unit,
      stock: Number(form.stock),
      low_stock: Number(form.low_stock),
    })
    const { data } = await supabase.from('supplies').select('*').eq('hotel_id', hotelId).order('name')
    setSupplies(data ?? [])
    setShowAdd(false)
    setForm({ name: '', unit: '개', stock: '0', low_stock: '5' })
    setSaving(false)
  }

  async function updateStock(id: string, delta: number) {
    const res = await fetch('/api/admin/supplies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, delta }),
    })
    if (!res.ok) return
    const { stock } = await res.json()
    setSupplies(prev => prev.map(s => s.id === id ? { ...s, stock } : s))
  }

  async function fulfillRequest(id: string) {
    const supabase = createClient()
    await supabase.from('supply_requests').update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'fulfilled' } : r))
  }

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
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>비품 관리</h1>
          <button
            onClick={() => setShowAdd(true)}
            style={{ padding: '8px 16px', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 0 18px ${C.accent}44` }}
          >+ 비품 추가</button>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {(['requests', 'stock'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 8,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: tab === t ? C.text : 'transparent',
                color: tab === t ? C.bg : C.textMid,
                transition: 'all 0.15s',
              }}
            >
              {t === 'requests' ? `요청 목록 (${requests.filter(r => r.status === 'pending').length})` : '재고 현황'}
            </button>
          ))}
        </div>

        {/* 요청 목록 */}
        {tab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {requests.length === 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '48px 0', textAlign: 'center', color: C.textDim, fontSize: 13 }}>직원 요청이 없습니다</div>
            )}
            {requests.map(r => (
              <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, opacity: r.status === 'fulfilled' ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{r.supplies?.name} × {r.qty}{r.supplies?.unit}</p>
                    <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                      {r.staff?.name ?? '게스트'} · {r.rooms?.number ? `${r.rooms.number}호` : '—'} · {new Date(r.requested_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {r.note && <p style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{r.note}</p>}
                  </div>
                  {r.status === 'pending' && (
                    <button
                      onClick={() => fulfillRequest(r.id)}
                      style={{ padding: '6px 12px', background: 'rgba(52,211,153,0.12)', color: C.green, fontSize: 11, fontWeight: 700, border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
                    >완료</button>
                  )}
                  {r.status === 'fulfilled' && (
                    <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>처리됨</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 재고 현황 */}
        {tab === 'stock' && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {supplies.length === 0 && (
              <div style={{ padding: '48px 0', textAlign: 'center', color: C.textDim, fontSize: 13 }}>등록된 비품이 없습니다</div>
            )}
            {supplies.map((s, idx) => (
              <div
                key={s.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: idx < supplies.length - 1 ? `1px solid ${C.border}` : 'none' }}
              >
                <div>
                  <p style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{s.name}</p>
                  <p style={{ fontSize: 11, color: C.textDim }}>최소 재고: {s.low_stock}{s.unit}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {s.stock <= s.low_stock && (
                    <span style={{ fontSize: 11, background: 'rgba(248,113,113,0.12)', color: C.red, fontWeight: 700, padding: '2px 9px', borderRadius: 999 }}>부족</span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => updateStock(s.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>−</button>
                    <span style={{ width: 40, textAlign: 'center', fontWeight: 700, color: C.text, fontSize: 13 }}>{s.stock}{s.unit}</span>
                    <button onClick={() => updateStock(s.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 비품 추가 모달 */}
      {showAdd && (
        <div style={modalOverlay} className="sm:items-center" onClick={() => setShowAdd(false)}>
          <div style={modalBox} className="sm:rounded-2xl sm:max-w-sm" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }} className="sm:hidden">
              <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999 }}/>
            </div>
            <div style={{ padding: '16px 20px 24px' }}>
              <h2 style={{ fontWeight: 700, color: C.text, fontSize: 16, marginBottom: 20 }}>비품 추가</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="비품명 (예: 타월)" style={inputSt} />
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="단위 (예: 개, 롤)" style={inputSt} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="현재 재고" style={{ ...inputSt, flex: 1 }} />
                  <input type="number" value={form.low_stock} onChange={e => setForm(f => ({ ...f, low_stock: e.target.value }))} placeholder="최소 재고" style={{ ...inputSt, flex: 1 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '13px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                <button onClick={addSupply} disabled={!form.name || saving} style={{ flex: 1, padding: '13px 0', background: C.accent, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: !form.name || saving ? 0.4 : 1, fontFamily: 'inherit' }}>{saving ? '추가 중...' : '추가'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
