'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Room = {
  id: string
  number: string
  floor: number
  type: string
  status: 'dirty' | 'cleaning' | 'done' | 'inspect'
  checkin_time: string | null
  hotel_id: string
}

type Assignment = {
  id: string
  room_id: string
  staff_id: string | null
  is_guest: boolean
  assigned_at: string
  staff: { id: string; name: string } | null
}

type Staff = { id: string; name: string }

const STATUS_CONFIG = {
  dirty:   { label: '더티',     bg: 'bg-gray-100',   text: 'text-gray-700'   },
  cleaning:{ label: '청소중',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  done:    { label: '완료',     bg: 'bg-green-100',  text: 'text-green-700'  },
  inspect: { label: '점검대기', bg: 'bg-purple-100', text: 'text-purple-700' },
}

const ALERT_MINUTES = Number(process.env.NEXT_PUBLIC_CHECKIN_ALERT_MINUTES ?? 120)

function isUrgent(room: Room, now: Date) {
  if (!room.checkin_time) return false
  if (room.status === 'done' || room.status === 'inspect') return false
  const alertAt = new Date(new Date(room.checkin_time).getTime() - ALERT_MINUTES * 60 * 1000)
  return now >= alertAt
}

function fmtTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  hotelId: string
  hotelName: string
  initialRooms: Room[]
  initialAssignments: Assignment[]
  staffList: Staff[]
}

export default function AdminDashboard({ hotelId, hotelName, initialRooms, initialAssignments, staffList }: Props) {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [now, setNow] = useState(new Date())

  const [filterFloor, setFilterFloor] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterStaff, setFilterStaff] = useState<string | null>(null)

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [modalAssign, setModalAssign] = useState<string>('')
  const [modalStatus, setModalStatus] = useState<string>('')
  const [modalCheckinTime, setModalCheckinTime] = useState<string>('')
  const [modalMemo, setModalMemo] = useState('')
  const [saving, setSaving] = useState(false)

  // 1분마다 시계 + 긴급 표시 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const [rr, ar] = await Promise.all([
      supabase.from('rooms').select('*').eq('hotel_id', hotelId).is('deleted_at', null).order('floor').order('number'),
      supabase.from('assignments').select('id, room_id, staff_id, is_guest, assigned_at, staff(id, name)').is('completed_at', null).is('cancelled_at', null),
    ])
    if (rr.data) setRooms(rr.data)
    if (ar.data) setAssignments(ar.data as unknown as Assignment[])
  }, [hotelId])

  // Realtime 구독
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, refetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function openModal(room: Room) {
    const a = assignments.find(a => a.room_id === room.id)
    setSelectedRoom(room)
    setModalStatus(room.status)
    setModalCheckinTime(room.checkin_time ? toDatetimeLocal(room.checkin_time) : '')
    setModalMemo('')
    setModalAssign(a?.is_guest ? 'guest' : (a?.staff_id ?? ''))
  }

  async function handleAssign() {
    if (!selectedRoom) return
    setSaving(true)
    await fetch('/api/admin/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: selectedRoom.id,
        staffId: modalAssign && modalAssign !== 'guest' ? modalAssign : undefined,
        isGuest: modalAssign === 'guest',
        unassign: !modalAssign,
      }),
    })
    await refetch()
    setSaving(false)
    setSelectedRoom(null)
  }

  async function handleStatusSave() {
    if (!selectedRoom) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('rooms').update({
      status: modalStatus,
      checkin_time: modalCheckinTime ? new Date(modalCheckinTime).toISOString() : null,
    }).eq('id', selectedRoom.id)
    await supabase.from('room_logs').insert({
      room_id: selectedRoom.id,
      status: modalStatus,
      changed_by: 'admin',
      memo: modalMemo || null,
    })
    await refetch()
    setSaving(false)
    setSelectedRoom(null)
  }

  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b)

  const filtered = rooms.filter(r => {
    if (filterFloor !== null && r.floor !== filterFloor) return false
    if (filterStatus && r.status !== filterStatus) return false
    if (filterStaff) {
      const a = assignments.find(a => a.room_id === r.id)
      if (filterStaff === 'none') return !a
      if (filterStaff === 'guest') return a?.is_guest === true
      return a?.staff_id === filterStaff
    }
    return true
  })

  const counts = {
    dirty:    rooms.filter(r => r.status === 'dirty').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
    done:     rooms.filter(r => r.status === 'done').length,
    inspect:  rooms.filter(r => r.status === 'inspect').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-900">{hotelName}</span>
            <nav className="hidden md:flex gap-5 text-sm">
              <a href="/admin" className="text-gray-900 font-medium border-b-2 border-gray-900 pb-0.5">현황판</a>
              <a href="/admin/rooms" className="text-gray-400 hover:text-gray-700">객실관리</a>
              <a href="/admin/staff" className="text-gray-400 hover:text-gray-700">직원관리</a>
              <a href="/admin/stats" className="text-gray-400 hover:text-gray-700">통계</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{now.toLocaleDateString('ko-KR')}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 상태 카운터 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? null : s)}
              className={`rounded-xl p-4 text-center transition-all border-2 ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text} ${filterStatus === s ? 'border-gray-900' : 'border-transparent'}`}
            >
              <p className="text-2xl font-bold">{counts[s]}</p>
              <p className="text-xs mt-0.5">{STATUS_CONFIG[s].label}</p>
            </button>
          ))}
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2 mb-5">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilterFloor(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filterFloor === null ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
            >전체 층</button>
            {floors.map(f => (
              <button
                key={f}
                onClick={() => setFilterFloor(filterFloor === f ? null : f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filterFloor === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
              >{f}층</button>
            ))}
          </div>
          <select
            value={filterStaff ?? ''}
            onChange={e => setFilterStaff(e.target.value || null)}
            className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-gray-600"
          >
            <option value="">전체 직원</option>
            <option value="none">미배정</option>
            <option value="guest">게스트</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* 객실 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(room => {
            const a = assignments.find(a => a.room_id === room.id)
            const urgent = isUrgent(room, now)
            const cfg = STATUS_CONFIG[room.status]
            const assignedName = a?.is_guest ? '게스트' : a?.staff?.name

            return (
              <button
                key={room.id}
                onClick={() => openModal(room)}
                className={`rounded-xl p-3 text-left border-2 transition-all hover:shadow-md bg-white ${urgent ? 'border-red-400' : 'border-transparent'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-bold text-gray-900 text-lg leading-none">{room.number}호</span>
                  {urgent && <span className="text-red-500 text-xs font-bold">⚠</span>}
                </div>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
                <div className="mt-2 space-y-0.5 text-xs text-gray-400">
                  <p>{room.floor}층</p>
                  {assignedName && <p className="font-medium text-gray-600">{assignedName}</p>}
                  {urgent && <p className="text-red-400">긴급</p>}
                  {room.checkin_time && <p>CI {fmtTime(room.checkin_time)}</p>}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-center py-20 text-gray-400 text-sm">객실이 없습니다</p>
          )}
        </div>
      </main>

      {/* 모달 */}
      {selectedRoom && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-20 p-4"
          onClick={() => setSelectedRoom(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold">{selectedRoom.number}호</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedRoom.floor}층 · {selectedRoom.type}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_CONFIG[selectedRoom.status].bg} ${STATUS_CONFIG[selectedRoom.status].text}`}>
                {STATUS_CONFIG[selectedRoom.status].label}
              </span>
            </div>

            {/* 배정 */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">담당 직원 배정</p>
              <div className="flex gap-2">
                <select
                  value={modalAssign}
                  onChange={e => setModalAssign(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">미배정</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  <option value="guest">게스트 (일일알바)</option>
                </select>
                <button
                  onClick={handleAssign}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                >배정</button>
              </div>
            </div>

            {/* 체크인 시간 */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">체크인 시간</p>
              <input
                type="datetime-local"
                value={modalCheckinTime}
                onChange={e => setModalCheckinTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              {modalCheckinTime && (
                <button onClick={() => setModalCheckinTime('')} className="mt-1 text-xs text-gray-400 hover:text-gray-600">
                  시간 제거
                </button>
              )}
            </div>

            {/* 상태 변경 */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">상태 변경</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setModalStatus(s)}
                    className={`py-2 rounded-lg text-xs font-medium border-2 ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text} ${modalStatus === s ? 'border-gray-900' : 'border-transparent'}`}
                  >{STATUS_CONFIG[s].label}</button>
                ))}
              </div>
            </div>

            {/* 메모 */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">메모 (선택)</p>
              <textarea
                value={modalMemo}
                onChange={e => setModalMemo(e.target.value)}
                placeholder="특이사항..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRoom(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600"
              >닫기</button>
              <button
                onClick={handleStatusSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-40"
              >상태 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
