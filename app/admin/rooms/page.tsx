'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

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
  dirty:    { label: '더티',     dot: 'bg-slate-400',   text: 'text-slate-500',   bg: 'bg-slate-100'   },
  cleaning: { label: '청소중',   dot: 'bg-amber-400',   text: 'text-amber-600',   bg: 'bg-amber-50'    },
  done:     { label: '완료',     dot: 'bg-[#05C072]',   text: 'text-emerald-600', bg: 'bg-emerald-50'  },
  inspect:  { label: '점검대기', dot: 'bg-violet-500',  text: 'text-violet-600',  bg: 'bg-violet-50'   },
}

const defaultForm = { number: '', floor: '', type: 'double' }

export default function RoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [hotelId, setHotelId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null)
  const [error, setError] = useState('')

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
    setSaving(true)
    setError('')
    const supabase = createClient()

    if (editRoom) {
      const { error: err } = await supabase
        .from('rooms')
        .update({ number: form.number.trim(), floor: Number(form.floor), type: form.type })
        .eq('id', editRoom.id)
      if (err) { setError('저장 실패: ' + err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase
        .from('rooms')
        .insert({ hotel_id: hotelId, number: form.number.trim(), floor: Number(form.floor), type: form.type })
      if (err) {
        setError(err.code === '23505' ? '이미 존재하는 호수입니다.' : '저장 실패: ' + err.message)
        setSaving(false); return
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
    <div className="min-h-screen bg-toss-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const byFloor = rooms.reduce<Record<number, Room[]>>((acc, r) => {
    acc[r.floor] = acc[r.floor] ?? []
    acc[r.floor].push(r)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-toss-bg">
      <AdminNav />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-[#191919]">객실 관리</h1>
            <p className="text-sm text-[#B0B8C1] mt-0.5">{rooms.length}개 등록됨</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl text-sm font-bold transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            객실 추가
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card py-24 text-center">
            <div className="w-12 h-12 bg-[#F2F4F6] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth={1.5} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5V19h18v-8.5M3 19v-2h18v2M2 10.5h20M8 10.5V7a4 4 0 0 1 8 0v3.5" />
              </svg>
            </div>
            <p className="text-[#191919] font-bold mb-1">등록된 객실이 없습니다</p>
            <button onClick={openAdd} className="text-sm text-toss-blue font-semibold mt-3 hover:underline">
              첫 번째 객실 추가하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.keys(byFloor).sort((a, b) => Number(a) - Number(b)).map(floor => (
              <div key={floor} className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-5 py-3" style={{ borderBottom: '1px solid #F2F4F6' }}>
                  <span className="text-xs font-bold text-[#B0B8C1]">{floor}층</span>
                </div>
                <div>
                  {byFloor[Number(floor)].map((room, idx) => {
                    const sc = STATUS_CONFIG[room.status]
                    const isLast = idx === byFloor[Number(floor)].length - 1
                    return (
                      <div
                        key={room.id}
                        className="px-5 py-4 flex items-center gap-4 hover:bg-[#F8F9FB] transition-colors"
                        style={!isLast ? { borderBottom: '1px solid #F2F4F6' } : undefined}
                      >
                        <div className="flex-1 flex items-center gap-4">
                          <span className="font-bold text-[#191919] text-base w-16">{room.number}호</span>
                          <span className="text-sm text-[#6B7684]">{TYPE_LABELS[room.type] ?? room.type}</span>
                          {sc && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => openEdit(room)}
                            className="text-sm text-[#6B7684] hover:text-toss-blue font-medium transition-colors"
                          >수정</button>
                          <button
                            onClick={() => setDeleteTarget(room)}
                            className="text-sm text-[#B0B8C1] hover:text-toss-error transition-colors"
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

      {/* 추가/수정 바텀시트 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm shadow-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-[#E8EAED] rounded-full" />
            </div>
            <div className="px-6 pt-5 pb-8">
              <h2 className="text-lg font-bold text-[#191919] mb-6">{editRoom ? '객실 수정' : '객실 추가'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#191919] mb-2">호수</label>
                  <input
                    value={form.number}
                    onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                    placeholder="예: 101, 302"
                    className="w-full px-4 py-3.5 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] placeholder:text-[#B0B8C1] focus:outline-none focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#191919] mb-2">층</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                    placeholder="예: 1, 3"
                    className="w-full px-4 py-3.5 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] placeholder:text-[#B0B8C1] focus:outline-none focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#191919] mb-2">타입</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                  >
                    <option value="single">싱글</option>
                    <option value="double">더블</option>
                    <option value="suite">스위트</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>
              {error && (
                <div className="mt-3 px-4 py-3 bg-[#FFF0F0] rounded-xl">
                  <p className="text-xs text-toss-error font-medium">{error}</p>
                </div>
              )}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3.5 bg-[#F2F4F6] hover:bg-[#E8EAED] rounded-xl text-sm font-bold text-[#191919] transition-colors"
                >취소</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3.5 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 바텀시트 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xs shadow-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-[#E8EAED] rounded-full" />
            </div>
            <div className="px-6 pt-5 pb-8 text-center">
              <div className="w-12 h-12 bg-[#FFF0F0] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="#F04452" className="w-6 h-6">
                  <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="font-bold text-[#191919] text-base mb-1">{deleteTarget.number}호를 삭제할까요?</p>
              <p className="text-sm text-[#B0B8C1] mb-6">삭제 후에도 이력은 보존됩니다</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3.5 bg-[#F2F4F6] hover:bg-[#E8EAED] rounded-xl text-sm font-bold text-[#191919] transition-colors"
                >취소</button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3.5 bg-toss-error hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
                >삭제</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
