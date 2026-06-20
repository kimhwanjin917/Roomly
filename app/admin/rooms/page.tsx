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
  single: '싱글',
  double: '더블',
  suite: '스위트',
  other: '기타',
}

const STATUS_LABELS: Record<string, string> = {
  dirty: '더티',
  cleaning: '청소중',
  done: '완료',
  inspect: '점검대기',
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
        .from('rooms')
        .select('*')
        .eq('hotel_id', hid)
        .is('deleted_at', null)
        .order('floor')
        .order('number')
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
    if (!form.number.trim() || !form.floor) {
      setError('호수와 층을 입력해 주세요.')
      return
    }
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
        setSaving(false)
        return
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">불러오는 중...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-5 text-sm">
            <a href="/admin" className="text-gray-400 hover:text-gray-700">현황판</a>
            <a href="/admin/rooms" className="text-gray-900 font-medium border-b-2 border-gray-900 pb-0.5">객실관리</a>
            <a href="/admin/staff" className="text-gray-400 hover:text-gray-700">직원관리</a>
            <a href="/admin/stats" className="text-gray-400 hover:text-gray-700">통계</a>
          </nav>
          <button
            onClick={openAdd}
            className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium"
          >+ 객실 추가</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {rooms.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">
              <p>등록된 객실이 없습니다</p>
              <button onClick={openAdd} className="mt-3 text-gray-900 font-medium underline text-sm">객실 추가하기</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">호수</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">층</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">타입</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">현재 상태</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map(room => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{room.number}호</td>
                    <td className="px-4 py-3 text-gray-600">{room.floor}층</td>
                    <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[room.type] ?? room.type}</td>
                    <td className="px-4 py-3 text-gray-600">{STATUS_LABELS[room.status] ?? room.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(room)} className="text-xs text-gray-500 hover:text-gray-800 mr-3">수정</button>
                      <button onClick={() => setDeleteTarget(room)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editRoom ? '객실 수정' : '객실 추가'}</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">호수</label>
                <input
                  value={form.number}
                  onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  placeholder="예: 101, 302"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">층</label>
                <input
                  type="number"
                  value={form.floor}
                  onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                  placeholder="예: 1, 3"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">타입</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-40">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <p className="font-medium text-gray-900 mb-1">{deleteTarget.number}호를 삭제할까요?</p>
            <p className="text-xs text-gray-400 mb-5">삭제 후에도 이력은 보존됩니다</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
