'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { C } from '@/lib/theme'

type Room = {
  id: string
  number: string
  floor: number
  type: string
  status: string
  checkin_time: string | null
}

const TYPE_LABELS: Record<string, string> = {
  single: '싱글', double: '더블', suite: '스위트', other: '기타',
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  dirty:    { label: '더티',     dot: C.textDim, text: C.textMid, bg: 'rgba(74,79,88,0.15)'    },
  cleaning: { label: '청소중',   dot: C.amber,   text: C.amber,   bg: 'rgba(251,191,36,0.10)'  },
  done:     { label: '완료',     dot: C.green,   text: C.green,   bg: 'rgba(52,211,153,0.10)'  },
  inspect:  { label: '점검대기', dot: C.violet,  text: C.violet,  bg: 'rgba(129,140,248,0.10)' },
}

const defaultForm = { number: '', floor: '', type: 'double' }

const inputSt: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 10, fontSize: 13, color: C.text,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

export default function RoomsPage() {
  const router = useRouter()
  const [rooms, setRooms]               = useState<Room[]>([])
  const [hotelId, setHotelId]           = useState<string>('')
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [editRoom, setEditRoom]         = useState<Room | null>(null)
  const [form, setForm]                 = useState(defaultForm)
  const [saving, setSaving]             = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null)
  const [error, setError]               = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const hid = user.app_metadata?.hotel_id as string
      setHotelId(hid)
      const { data } = await supabase
        .from('rooms').select('*').eq('hotel_id', hid).is('deleted_at', null).order('floor').order('number')
      setRooms(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  function openAdd() {
    setEditRoom(null)
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(room: Room) {
    setEditRoom(room)
    setForm({ number: room.number, floor: String(room.floor), type: room.type })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.number.trim() || !form.floor) { setError('호수와 층을 입력해 주세요.'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    if (editRoom) {
      const { error: err } = await supabase
        .from('rooms')
        .update({ number: form.number.trim(), floor: Number(form.floor), type: form.type })
        .eq('id', editRoom.id)
      if (err) { setError('저장 실패: ' + err.message); setSaving(false); return }
    } else {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: form.number.trim(), floor: Number(form.floor), type: form.type }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) { setError('이미 존재하는 호수입니다.'); setSaving(false); return }
        if (res.status === 403) { setError(`객실 등록 한도(${data.limit}개)에 도달했습니다. 플랜을 업그레이드하세요.`); setSaving(false); return }
        setError('저장 실패: ' + (data.detail ?? data.error ?? '')); setSaving(false); return
      }
    }
    const { data } = await supabase
      .from('rooms').select('*').eq('hotel_id', hotelId).is('deleted_at', null).order('floor').order('number')
    setRooms(data ?? [])
    setSaving(false)
    setShowModal(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const supabase = createClient()
    await supabase.from('rooms').update({ deleted_at: new Date().toISOString() }).eq('id', deleteTarget.id)
    setRooms(r => r.filter(x => x.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  if (loading) return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.7s linear infinite' }}/>
    </div>
  )

  const byFloor = rooms.reduce<Record<number, Room[]>>((acc, r) => {
    acc[r.floor] = acc[r.floor] ?? []
    acc[r.floor].push(r)
    return acc
  }, {})

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

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px' }} className="md:pb-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>객실 관리</h1>
            <p style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>{rooms.length}개 등록됨</p>
          </div>
          <button
            onClick={openAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: C.accent, color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: `0 0 18px ${C.accent}44`,
            }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            객실 추가
          </button>
        </div>

        {rooms.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: C.surface, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth={1.5} style={{ width: 22, height: 22 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5V19h18v-8.5M3 19v-2h18v2M2 10.5h20M8 10.5V7a4 4 0 0 1 8 0v3.5" />
              </svg>
            </div>
            <p style={{ color: C.text, fontWeight: 700, marginBottom: 4 }}>등록된 객실이 없습니다</p>
            <button onClick={openAdd} style={{ fontSize: 13, color: C.accent, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}>
              첫 번째 객실 추가하기
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.keys(byFloor).sort((a, b) => Number(a) - Number(b)).map(floor => (
              <div key={floor} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.05em' }}>{floor}층</span>
                </div>
                <div>
                  {byFloor[Number(floor)].map((room, idx) => {
                    const sc = STATUS_CONFIG[room.status]
                    const isLast = idx === byFloor[Number(floor)].length - 1
                    return (
                      <div
                        key={room.id}
                        style={{
                          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
                          borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '' }}
                      >
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span style={{ fontWeight: 700, color: C.text, fontSize: 14, minWidth: 52 }}>{room.number}호</span>
                          <span style={{ fontSize: 12, color: C.textMid }}>{TYPE_LABELS[room.type] ?? room.type}</span>
                          {sc && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                              background: sc.bg, color: sc.text,
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, flexShrink: 0 }}/>
                              {sc.label}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <button
                            onClick={() => openEdit(room)}
                            style={{ fontSize: 12, color: C.textMid, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'color 0.1s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = C.accent }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = C.textMid }}
                          >수정</button>
                          <button
                            onClick={() => setDeleteTarget(room)}
                            style={{ fontSize: 12, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.1s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = C.red }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = C.textDim }}
                          >삭제</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div style={modalOverlay} className="sm:items-center" onClick={() => setShowModal(false)}>
          <div style={modalBox} className="sm:rounded-2xl sm:max-w-sm" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }} className="sm:hidden">
              <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999 }}/>
            </div>
            <div style={{ padding: '16px 20px 24px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 20 }}>{editRoom ? '객실 수정' : '객실 추가'}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>호수</label>
                  <input
                    value={form.number}
                    onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                    placeholder="예: 101, 302"
                    style={inputSt}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.accent }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>층</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                    placeholder="예: 1, 3"
                    style={inputSt}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.accent }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>타입</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    style={{ ...inputSt, cursor: 'pointer' }}
                    onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = C.accent }}
                    onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = C.border }}
                  >
                    <option value="single">싱글</option>
                    <option value="double">더블</option>
                    <option value="suite">스위트</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>
              {error && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(248,113,113,0.07)', border: `1px solid rgba(248,113,113,0.16)`, borderRadius: 10 }}>
                  <p style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{error}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '13px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}
                >취소</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ flex: 1, padding: '13px 0', background: C.accent, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'inherit' }}
                >{saving ? '저장 중...' : '저장'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div style={modalOverlay} className="sm:items-center" onClick={() => setDeleteTarget(null)}>
          <div style={{ ...modalBox, maxWidth: 360 }} className="sm:rounded-2xl sm:max-w-xs" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }} className="sm:hidden">
              <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999 }}/>
            </div>
            <div style={{ padding: '16px 20px 24px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: 'rgba(248,113,113,0.1)', border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg viewBox="0 0 24 24" fill={C.red} style={{ width: 22, height: 22 }}>
                  <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
                </svg>
              </div>
              <p style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>{deleteTarget.number}호를 삭제할까요?</p>
              <p style={{ fontSize: 13, color: C.textDim, marginBottom: 20 }}>삭제 후에도 이력은 보존됩니다</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{ flex: 1, padding: '13px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}
                >취소</button>
                <button
                  onClick={handleDelete}
                  style={{ flex: 1, padding: '13px 0', background: C.red, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                >삭제</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
