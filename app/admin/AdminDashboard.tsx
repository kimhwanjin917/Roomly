'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'
import OnboardingChecklist from '@/components/OnboardingChecklist'

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
type ViewMode = 'grid' | 'table'

const STATUS_CONFIG = {
  dirty:   { label: '더티',     bg: 'bg-slate-100',    text: 'text-slate-500',   dot: 'bg-slate-400',   activeBg: '#F2F4F6' },
  cleaning:{ label: '청소중',   bg: 'bg-amber-50',     text: 'text-amber-600',   dot: 'bg-amber-400',   activeBg: '#FFFBEB' },
  done:    { label: '완료',     bg: 'bg-emerald-50',   text: 'text-emerald-600', dot: 'bg-[#05C072]',   activeBg: '#ECFDF5' },
  inspect: { label: '점검대기', bg: 'bg-violet-50',    text: 'text-violet-600',  dot: 'bg-violet-500',  activeBg: '#F5F3FF' },
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
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [now, setNow] = useState(new Date())

  const [filterFloor, setFilterFloor] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterStaff, setFilterStaff] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('table')
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
    <div className="min-h-screen bg-toss-bg">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 py-5 pb-20 md:pb-6">

        <OnboardingChecklist
          roomCount={rooms.length}
          staffCount={staffList.length}
          hasAssignment={assignments.length > 0}
        />

        {/* 상태 카운터 카드 */}
        <div className="grid grid-cols-4 gap-2.5 mb-5">
          {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(s => {
            const cfg = STATUS_CONFIG[s]
            const active = filterStatus === s
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(active ? null : s)}
                className={`bg-white rounded-2xl p-4 text-left transition-all shadow-card ${
                  active ? 'ring-2 ring-toss-blue' : 'hover:shadow-card-hover'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-xs text-[#6B7684] font-medium">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-[#191919] leading-none">{counts[s]}</p>
              </button>
            )
          })}
        </div>

        {/* 필터 + 뷰모드 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterFloor(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterFloor === null
                  ? 'bg-[#191919] text-white'
                  : 'bg-white text-[#6B7684] hover:bg-[#E8EAED]'
              }`}
            >전체</button>
            {floors.map(f => (
              <button
                key={f}
                onClick={() => setFilterFloor(filterFloor === f ? null : f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filterFloor === f
                    ? 'bg-[#191919] text-white'
                    : 'bg-white text-[#6B7684] hover:bg-[#E8EAED]'
                }`}
              >{f}층</button>
            ))}
          </div>
          <select
            value={filterStaff ?? ''}
            onChange={e => setFilterStaff(e.target.value || null)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-[#6B7684] focus:outline-none focus:ring-2 focus:ring-toss-blue cursor-pointer"
          >
            <option value="">전체 직원</option>
            <option value="none">미배정</option>
            <option value="guest">게스트</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[#B0B8C1] font-medium">{filtered.length}개</span>
            <div className="flex rounded-xl overflow-hidden bg-white shadow-card">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'table' ? 'bg-[#191919] text-white' : 'text-[#6B7684] hover:bg-[#F2F4F6]'
                }`}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <rect x="1" y="3" width="14" height="2.5" rx="1" />
                  <rect x="1" y="7" width="14" height="2.5" rx="1" />
                  <rect x="1" y="11" width="14" height="2.5" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'grid' ? 'bg-[#191919] text-white' : 'text-[#6B7684] hover:bg-[#F2F4F6]'
                }`}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <rect x="1" y="1" width="6" height="6" rx="1.5" />
                  <rect x="9" y="1" width="6" height="6" rx="1.5" />
                  <rect x="1" y="9" width="6" height="6" rx="1.5" />
                  <rect x="9" y="9" width="6" height="6" rx="1.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 객실 없음 */}
        {rooms.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card py-20 text-center">
            <div className="w-12 h-12 bg-[#F2F4F6] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth={1.5} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5V19h18v-8.5M3 19v-2h18v2M2 10.5h20M8 10.5V7a4 4 0 0 1 8 0v3.5" />
              </svg>
            </div>
            <p className="text-[#191919] font-bold mb-1">등록된 객실이 없습니다</p>
            <p className="text-sm text-[#B0B8C1] mb-6">객실을 먼저 등록하면 현황판을 사용할 수 있습니다.</p>
            <a
              href="/admin/onboarding"
              className="inline-flex items-center px-6 py-3 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl text-sm font-bold transition-colors"
            >시작하기</a>
          </div>
        )}

        {/* 테이블 뷰 */}
        {rooms.length > 0 && viewMode === 'table' && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F2F4F6' }}>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#B0B8C1]">호수</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#B0B8C1]">층</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#B0B8C1] hidden sm:table-cell">타입</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#B0B8C1]">상태</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#B0B8C1] hidden md:table-cell">담당자</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#B0B8C1]">체크인</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((room, idx) => {
                  const a = assignments.find(a => a.room_id === room.id)
                  const urgent = isUrgent(room, now)
                  const cfg = STATUS_CONFIG[room.status]
                  const assignedName = a?.is_guest ? '게스트' : a?.staff?.name
                  const isLast = idx === filtered.length - 1
                  return (
                    <tr
                      key={room.id}
                      onClick={() => openModal(room)}
                      className={`cursor-pointer transition-colors hover:bg-[#F8F9FB] ${urgent ? 'bg-[#FFF5F5]' : ''}`}
                      style={!isLast ? { borderBottom: '1px solid #F2F4F6' } : undefined}
                    >
                      <td className="px-5 py-3.5 font-bold text-[#191919]">
                        <div className="flex items-center gap-2">
                          {room.number}호
                          {urgent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFF0F0] text-toss-error text-[10px] font-bold">긴급</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7684]">{room.floor}층</td>
                      <td className="px-5 py-3.5 text-[#6B7684] hidden sm:table-cell">{room.type}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#191919] font-medium hidden md:table-cell">
                        {assignedName ?? <span className="text-[#E8EAED]">—</span>}
                      </td>
                      <td className={`px-5 py-3.5 text-sm font-semibold ${urgent ? 'text-toss-error' : 'text-[#6B7684]'}`}>
                        {room.checkin_time ? fmtTime(room.checkin_time) : <span className="text-[#E8EAED]">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <svg viewBox="0 0 20 20" fill="#B0B8C1" className="w-4 h-4 inline-block">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                        </svg>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-[#B0B8C1] text-sm">해당하는 객실이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 카드 그리드 뷰 */}
        {rooms.length > 0 && viewMode === 'grid' && (
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
                  className={`bg-white rounded-2xl p-4 text-left transition-all shadow-card hover:shadow-card-hover active:scale-95 ${
                    urgent ? 'ring-1.5 ring-toss-error' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xl font-bold text-[#191919] leading-none">{room.number}</span>
                    {urgent && (
                      <span className="w-2 h-2 rounded-full bg-toss-error mt-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-[#B0B8C1]">{room.floor}층</p>
                    {assignedName && (
                      <p className="text-xs text-[#191919] font-semibold truncate">{assignedName}</p>
                    )}
                    {room.checkin_time && (
                      <p className={`text-xs font-semibold ${urgent ? 'text-toss-error' : 'text-[#6B7684]'}`}>
                        CI {fmtTime(room.checkin_time)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="col-span-full text-center py-20 text-[#B0B8C1] text-sm">해당하는 객실이 없습니다</p>
            )}
          </div>
        )}
      </main>

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 px-5 py-3.5 rounded-2xl text-sm font-semibold text-white shadow-modal z-50 whitespace-nowrap ${
          toast.type === 'error' ? 'bg-toss-error' : 'bg-toss-success'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* 바텀시트 모달 */}
      {selectedRoom && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20"
          onClick={() => setSelectedRoom(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm shadow-modal overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 핸들 (모바일) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-[#E8EAED] rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="px-6 pt-4 pb-5" style={{ borderBottom: '1px solid #F2F4F6' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#191919]">{selectedRoom.number}호</h2>
                  <p className="text-xs text-[#B0B8C1] mt-0.5">{selectedRoom.floor}층 · {selectedRoom.type}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_CONFIG[selectedRoom.status as keyof typeof STATUS_CONFIG].bg} ${STATUS_CONFIG[selectedRoom.status as keyof typeof STATUS_CONFIG].text}`}>
                  {STATUS_CONFIG[selectedRoom.status as keyof typeof STATUS_CONFIG].label}
                </span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* 담당 직원 배정 */}
              <div>
                <p className="text-xs font-bold text-[#191919] mb-2">담당 직원</p>
                <div className="flex gap-2">
                  <select
                    value={modalAssign}
                    onChange={e => setModalAssign(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                  >
                    <option value="">미배정</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="guest">게스트 (일일알바)</option>
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={saving}
                    className="px-5 py-3 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
                  >배정</button>
                </div>
              </div>

              {/* 체크인 시간 */}
              <div>
                <p className="text-xs font-bold text-[#191919] mb-2">체크인 시간</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="datetime-local"
                    value={modalCheckinTime}
                    onChange={e => setModalCheckinTime(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] focus:outline-none focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                  />
                  {modalCheckinTime && (
                    <button onClick={() => setModalCheckinTime('')} className="text-xs text-[#B0B8C1] hover:text-[#6B7684] shrink-0 font-medium transition-colors">제거</button>
                  )}
                </div>
              </div>

              {/* 상태 변경 */}
              <div>
                <p className="text-xs font-bold text-[#191919] mb-2">상태 변경</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setModalStatus(s)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text} ${
                        modalStatus === s ? 'ring-2 ring-[#191919]' : ''
                      }`}
                    >{STATUS_CONFIG[s].label}</button>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              <div>
                <p className="text-xs font-bold text-[#191919] mb-2">메모 <span className="text-[#B0B8C1] font-normal">(선택)</span></p>
                <textarea
                  value={modalMemo}
                  onChange={e => setModalMemo(e.target.value)}
                  placeholder="특이사항을 입력하세요..."
                  rows={2}
                  className="w-full px-4 py-3 bg-[#F2F4F6] rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all placeholder:text-[#B0B8C1]"
                />
              </div>

              <div className="flex gap-2 pt-1 pb-2">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="flex-1 py-3.5 bg-[#F2F4F6] hover:bg-[#E8EAED] rounded-xl text-sm font-bold text-[#191919] transition-colors"
                >닫기</button>
                <button
                  onClick={handleStatusSave}
                  disabled={saving}
                  className="flex-1 py-3.5 bg-[#191919] hover:bg-[#333] text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
                >{saving ? '저장 중...' : '저장'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
