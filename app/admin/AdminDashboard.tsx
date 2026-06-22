'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
type Toast = { msg: string; type: 'error' | 'success' }

const STATUS_CONFIG = {
  dirty:   { label: '더티',     bg: 'bg-slate-100',    text: 'text-slate-600',   dot: 'bg-slate-400'   },
  cleaning:{ label: '청소중',   bg: 'bg-amber-50',     text: 'text-amber-700',   dot: 'bg-amber-400'   },
  done:    { label: '완료',     bg: 'bg-emerald-50',   text: 'text-emerald-700', dot: 'bg-emerald-500' },
  inspect: { label: '점검대기', bg: 'bg-violet-50',    text: 'text-violet-700',  dot: 'bg-violet-500'  },
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
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string, type: Toast['type'] = 'error') {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

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
    try {
      const res = await fetch('/api/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          staffId: modalAssign && modalAssign !== 'guest' ? modalAssign : undefined,
          isGuest: modalAssign === 'guest',
          unassign: !modalAssign,
        }),
      })
      if (!res.ok) throw new Error()
      await refetch()
      setSelectedRoom(null)
    } catch {
      showToast('배정에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusSave() {
    if (!selectedRoom) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          status: modalStatus,
          checkinTime: modalCheckinTime || null,
          memo: modalMemo || null,
        }),
      })
      if (!res.ok) throw new Error()
      await refetch()
      setSelectedRoom(null)
    } catch {
      showToast('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
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
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="font-semibold text-slate-800 text-sm">{hotelName}</span>
            </div>
            <nav className="hidden md:flex gap-1">
              {[
                { href: '/admin', label: '현황판', active: true },
                { href: '/admin/rooms', label: '객실관리', active: false },
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
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-slate-400">{now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
            <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5">
        {/* 상태 카운터 */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(s => {
            const cfg = STATUS_CONFIG[s]
            const active = filterStatus === s
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(active ? null : s)}
                className={`rounded-xl p-3 text-left border transition-all ${
                  active ? 'border-slate-900 bg-white shadow-sm' : 'border-transparent bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-xs text-slate-500">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{counts[s]}</p>
              </button>
            )
          })}
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilterFloor(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterFloor === null ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
            >전체 층</button>
            {floors.map(f => (
              <button
                key={f}
                onClick={() => setFilterFloor(filterFloor === f ? null : f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterFloor === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
              >{f}층</button>
            ))}
          </div>
          <select
            value={filterStaff ?? ''}
            onChange={e => setFilterStaff(e.target.value || null)}
            className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 직원</option>
            <option value="none">미배정</option>
            <option value="guest">게스트</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length}개 객실</span>
        </div>

        {/* 객실 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {filtered.map(room => {
            const a = assignments.find(a => a.room_id === room.id)
            const urgent = isUrgent(room, now)
            const cfg = STATUS_CONFIG[room.status]
            const assignedName = a?.is_guest ? '게스트' : a?.staff?.name

            return (
              <button
                key={room.id}
                onClick={() => openModal(room)}
                className={`bg-white rounded-xl p-3 text-left border transition-all hover:shadow-md active:scale-95 ${
                  urgent ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-bold text-slate-900 text-lg leading-none">{room.number}</span>
                  {urgent && <span className="text-red-500 text-base leading-none">⚠</span>}
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                </div>
                <div className="space-y-0.5 text-xs text-slate-400">
                  <p>{room.floor}층</p>
                  {assignedName && <p className="text-slate-600 font-medium truncate">{assignedName}</p>}
                  {room.checkin_time && (
                    <p className={urgent ? 'text-red-500 font-medium' : ''}>CI {fmtTime(room.checkin_time)}</p>
                  )}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-center py-20 text-slate-400 text-sm">객실이 없습니다</p>
          )}
        </div>
      </main>

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* 모달 */}
      {selectedRoom && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-20 p-4"
          onClick={() => setSelectedRoom(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className={`px-5 pt-5 pb-4 border-b border-slate-100 ${STATUS_CONFIG[selectedRoom.status as keyof typeof STATUS_CONFIG].bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedRoom.number}호</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedRoom.floor}층 · {selectedRoom.type}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CONFIG[selectedRoom.status as keyof typeof STATUS_CONFIG].bg} ${STATUS_CONFIG[selectedRoom.status as keyof typeof STATUS_CONFIG].text} border border-current/20`}>
                  {STATUS_CONFIG[selectedRoom.status as keyof typeof STATUS_CONFIG].label}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* 배정 */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">담당 직원</p>
                <div className="flex gap-2">
                  <select
                    value={modalAssign}
                    onChange={e => setModalAssign(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">미배정</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="guest">게스트 (일일알바)</option>
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                  >배정</button>
                </div>
              </div>

              {/* 체크인 시간 */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">체크인 시간</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="datetime-local"
                    value={modalCheckinTime}
                    onChange={e => setModalCheckinTime(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {modalCheckinTime && (
                    <button onClick={() => setModalCheckinTime('')} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">제거</button>
                  )}
                </div>
              </div>

              {/* 상태 변경 */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">상태 변경</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setModalStatus(s)}
                      className={`py-2 rounded-lg text-xs font-medium border-2 transition-colors ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text} ${
                        modalStatus === s ? 'border-slate-900' : 'border-transparent'
                      }`}
                    >{STATUS_CONFIG[s].label}</button>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">메모 (선택)</p>
                <textarea
                  value={modalMemo}
                  onChange={e => setModalMemo(e.target.value)}
                  placeholder="특이사항..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >닫기</button>
                <button
                  onClick={handleStatusSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                >{saving ? '저장 중...' : '상태 저장'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
