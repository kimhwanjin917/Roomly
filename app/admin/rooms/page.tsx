'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  dirty:    { label: '더티',     dot: 'bg-slate-400',   text: 'text-slate-500'   },
  cleaning: { label: '청소중',   dot: 'bg-amber-400',   text: 'text-amber-600'   },
  done:     { label: '완료',     dot: 'bg-emerald-500', text: 'text-emerald-600' },
  inspect:  { label: '점검대기', dot: 'bg-violet-500',  text: 'text-violet-600'  },
}

const defaultForm = { number: '', floor: '', type: 'double' }

export default function RoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [hotelId, setHotelId] = useState<string>('')
  const [hotelName, setHotelName] = useState('')
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

      const [roomsRes, hotelRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('hotel_id', hid).is('deleted_at', null).order('floor').order('number'),
        supabase.from('hotels').select('name').eq('id', hid).single(),
      ])
      setRooms(roomsRes.data ?? [])
      setHotelName(hotelRes.data?.name ?? '')
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

    const { data } = await supabase.from('rooms').select('*').eq('hotel_id', hotelId).is('deleted_at', null).order('floor').order('number')
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-sm text-slate-400">불러오는 중...</div>
    </div>
  )

  const byFloor = rooms.reduce<Record<number, Room[]>>((acc, r) => {
    acc[r.floor] = acc[r.floor] ?? []
    acc[r.floor].push(r)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="font-semibold text-slate-800 text-sm hidden sm:block">{hotelName}</span>
            </div>
            <nav className="flex gap-1">
              {[
                { href: '/admin', label: '현황판', active: false },
                { href: '/admin/rooms', label: '객실관리', active: true },
                { href: '/admin/staff', label: '직원관리', active: false },
                { href: '/admin/stats', label: '통계', active: false },
              ].map(n => (
                <a key={n.href} href={n.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    n.active ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >{n.label}</a>
              ))}
            </nav>
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >+ 객실 추가</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base font-semibold text-slate-900">객실 목록 <span className="text-slate-400 font-normal ml-1">{rooms.length}개</span></h1>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-24 text-center">
            <p className="text-slate-400 text-sm mb-3">등록된 객실이 없습니다</p>
            <button onClick={openAdd} className="text-blue-600 font-medium text-sm hover:underline">객실 추가하기</button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(byFloor).sort((a, b) => Number(a) - Number(b)).map(floor => (
              <div key={floor} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{floor}층</span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {byFloor[Number(floor)].map(room => {
                      const sc = STATUS_CONFIG[room.status]
                      return (
                        <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 w-20">{room.number}호</td>
                          <td className="px-4 py-3 text-slate-500">{TYPE_LABELS[room.type] ?? room.type}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${sc?.dot ?? 'bg-slate-300'}`} />
                              <span className={`text-xs ${sc?.text ?? 'text-slate-400'}`}>{sc?.label ?? room.status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openEdit(room)} className="text-xs text-slate-400 hover:text-slate-700 mr-4 transition-colors">수정</button>
                            <button onClick={() => setDeleteTarget(room)} className="text-xs text-red-400 hover:text-red-600 transition-colors">삭제</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-slate-900 mb-4">{editRoom ? '객실 수정' : '객실 추가'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">호수</label>
                <input
                  value={form.number}
                  onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  placeholder="예: 101, 302"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">층</label>
                <input
                  type="number"
                  value={form.floor}
                  onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                  placeholder="예: 1, 3"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">타입</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="single">싱글</option>
                  <option value="double">더블</option>
                  <option value="suite">스위트</option>
                  <option value="other">기타</option>
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-5 text-center" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-slate-900 mb-1">{deleteTarget.number}호를 삭제할까요?</p>
            <p className="text-xs text-slate-400 mb-5">삭제 후에도 이력은 보존됩니다</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">취소</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
