'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

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
type Toast = { msg: string; type: 'error' | 'success'; retry?: boolean }
type ViewMode = 'grid' | 'table'
type AiRecommendation = { roomId: string; staffId: string; reason: string }
type DurationEstimate = { avgMinutes: number; sampleCount: number }

const STATUS_CONFIG = {
  dirty:   { label: '더티',     bg: 'bg-slate-100',    text: 'text-slate-600',   dot: 'bg-slate-400'   },
  cleaning:{ label: '청소중',   bg: 'bg-amber-50',     text: 'text-amber-700',   dot: 'bg-amber-400'   },
  done:    { label: '완료',     bg: 'bg-emerald-50',   text: 'text-emerald-700', dot: 'bg-emerald-500' },
  inspect: { label: '점검대기', bg: 'bg-violet-50',    text: 'text-violet-700',  dot: 'bg-violet-500'  },
}

function isUrgent(room: Room, now: Date, alertMinutes: number) {
  if (!room.checkin_time) return false
  if (room.status === 'done' || room.status === 'inspect') return false
  const alertAt = new Date(new Date(room.checkin_time).getTime() - alertMinutes * 60 * 1000)
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
  checkinAlertMinutes: number
  subscriptionPlan: string
  trialEndsAt: string | null
  initialRooms: Room[]
  initialAssignments: Assignment[]
  staffList: Staff[]
}

export default function AdminDashboard({ hotelId, hotelName, checkinAlertMinutes, subscriptionPlan, trialEndsAt, initialRooms, initialAssignments, staffList }: Props) {
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

  const [bulkCheckinOpen, setBulkCheckinOpen] = useState(false)
  const [bulkTimes, setBulkTimes] = useState<Record<string, string>>({}) // roomId → HH:MM
  const [bulkSaving, setBulkSaving] = useState(false)

  const [quickAssignRoom, setQuickAssignRoom] = useState<string | null>(null) // room.id

  // AI 스마트 배정 추천 (AI-02)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRecs, setAiRecs] = useState<AiRecommendation[] | null>(null)
  const [aiApplying, setAiApplying] = useState(false)

  // 청소 소요시간 예측 (AI-04)
  const [durationEstimate, setDurationEstimate] = useState<DurationEstimate | null>(null)

  function showToast(msg: string, type: Toast['type'] = 'error', retry = false) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type, retry })
    // 재시도 버튼이 있는 토스트는 자동으로 닫지 않음
    if (!retry) {
      toastTimer.current = setTimeout(() => setToast(null), 3000)
    }
  }

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const refetch = useCallback(async () => {
    try {
      const supabase = createClient()
      const [rr, ar] = await Promise.all([
        supabase.from('rooms').select('*').eq('hotel_id', hotelId).is('deleted_at', null).order('floor').order('number'),
        supabase.from('assignments').select('id, room_id, staff_id, is_guest, assigned_at, staff(id, name)').is('completed_at', null).is('cancelled_at', null),
      ])
      if (rr.error || ar.error) throw new Error('fetch_failed')
      if (rr.data) setRooms(rr.data)
      if (ar.data) setAssignments(ar.data as unknown as Assignment[])
      setToast(t => (t?.retry ? null : t)) // 성공 시 재시도 토스트 제거
    } catch {
      showToast('데이터를 불러오지 못했습니다.', 'error', true)
    }
  }, [hotelId])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, refetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  useEffect(() => {
    if (!quickAssignRoom) return
    const handler = () => setQuickAssignRoom(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [quickAssignRoom])

  function openModal(room: Room) {
    const a = assignments.find(a => a.room_id === room.id)
    setSelectedRoom(room)
    setModalStatus(room.status)
    setModalCheckinTime(room.checkin_time ? toDatetimeLocal(room.checkin_time) : '')
    setModalMemo('')
    setModalAssign(a?.is_guest ? 'guest' : (a?.staff_id ?? ''))
  }

  // AI-04: 배정 모달에서 직원 선택 시 최근 완료 이력 10건으로 평균 소요시간 계산
  useEffect(() => {
    setDurationEstimate(null)
    if (!selectedRoom || !modalAssign || modalAssign === 'guest') return

    let cancelled = false
    const supabase = createClient()
    supabase
      .from('assignments')
      .select('assigned_at, completed_at')
      .eq('staff_id', modalAssign)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (cancelled || !data) return
        const durations = data
          .map(a => new Date(a.completed_at as string).getTime() - new Date(a.assigned_at as string).getTime())
          .filter(ms => ms > 0)
        if (durations.length < 3) return // 이력 부족 시 배지 숨김
        const avgMs = durations.reduce((sum, ms) => sum + ms, 0) / durations.length
        setDurationEstimate({ avgMinutes: Math.round(avgMs / 60_000), sampleCount: durations.length })
      })
    return () => { cancelled = true }
  }, [modalAssign, selectedRoom])

  // AI-02: AI 스마트 배정 추천
  async function requestAiRecommendation() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/admin/ai-assign', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json() as { recommendations: AiRecommendation[] }
      if (!Array.isArray(data.recommendations) || data.recommendations.length === 0) throw new Error()
      setAiRecs(data.recommendations)
    } catch {
      showToast('추천을 생성하지 못했습니다.')
    } finally {
      setAiLoading(false)
    }
  }

  async function applyAiRecommendations() {
    if (!aiRecs?.length) return
    setAiApplying(true)
    try {
      const results = await Promise.all(
        aiRecs.map(rec =>
          fetch('/api/admin/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: rec.roomId, staffId: rec.staffId }),
          }),
        ),
      )
      if (results.some(r => !r.ok)) throw new Error()
      await refetch()
      setAiRecs(null)
      showToast('AI 추천 배정이 적용되었습니다', 'success')
    } catch {
      showToast('일부 배정에 실패했습니다. 현황을 확인해주세요.')
      await refetch()
    } finally {
      setAiApplying(false)
    }
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

  async function handleBulkCheckin() {
    setBulkSaving(true)
    try {
      const supabase = createClient()
      const updates = rooms.map(r => ({
        id: r.id,
        checkin_time: bulkTimes[r.id]
          ? (() => {
              const [h, m] = bulkTimes[r.id].split(':')
              const d = new Date()
              d.setHours(Number(h), Number(m), 0, 0)
              return d.toISOString()
            })()
          : null,
      }))
      await supabase.from('rooms').upsert(updates, { onConflict: 'id' })
      await refetch()
      setBulkCheckinOpen(false)
      setBulkTimes({})
      showToast('체크인 시간이 저장되었습니다', 'success')
    } catch {
      showToast('저장에 실패했습니다.')
    } finally {
      setBulkSaving(false)
    }
  }

  async function quickAssign(roomId: string, staffId: string | null, isGuest = false) {
    try {
      await fetch('/api/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          staffId: staffId && staffId !== 'guest' ? staffId : undefined,
          isGuest: staffId === 'guest' || isGuest,
          unassign: !staffId,
        }),
      })
      await refetch()
    } catch {
      showToast('배정에 실패했습니다.')
    } finally {
      setQuickAssignRoom(null)
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

  const unassignedDirtyCount = rooms.filter(
    r => r.status === 'dirty' && !assignments.some(a => a.room_id === r.id),
  ).length

  // T-024: 무료체험 D-day
  const trialDaysLeft = subscriptionPlan === 'trial' && trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : null

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 py-5 pb-16 md:pb-5">
        {/* 무료체험 배너 */}
        {trialDaysLeft !== null && (
          <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 mb-4 ${
            trialDaysLeft <= 3
              ? 'bg-amber-50 border-amber-300'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-sm font-medium ${trialDaysLeft <= 3 ? 'text-amber-800' : 'text-blue-800'}`}>
              {trialDaysLeft > 0
                ? <>D-{trialDaysLeft}일 무료체험 중</>
                : <>무료체험이 종료되었습니다</>}
              {trialDaysLeft > 0 && trialDaysLeft <= 3 && (
                <span className="ml-2 text-xs font-normal text-amber-700">곧 종료됩니다 — 지금 업그레이드하세요</span>
              )}
            </p>
            {(trialDaysLeft <= 3) && (
              <a
                href="/admin/billing"
                className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >업그레이드</a>
            )}
          </div>
        )}
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
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400">{filtered.length}개 객실</span>
            {unassignedDirtyCount > 0 && staffList.length > 0 && (
              <button
                onClick={requestAiRecommendation}
                disabled={aiLoading}
                className="px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >{aiLoading ? '추천 생성 중...' : '✦ AI 배정 추천'}</button>
            )}
            <button
              onClick={() => {
                const times: Record<string, string> = {}
                rooms.forEach(r => {
                  if (r.checkin_time) {
                    const d = new Date(r.checkin_time)
                    times[r.id] = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                  }
                })
                setBulkTimes(times)
                setBulkCheckinOpen(true)
              }}
              className="px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50"
            >체크인 일괄</button>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >표</button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >카드</button>
            </div>
          </div>
        </div>

        {/* 객실 없음 — 빈 상태 (T-053) */}
        {rooms.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
            <p className="text-slate-800 font-semibold mb-1">아직 객실이 없습니다</p>
            <p className="text-sm text-slate-400 mb-6">객실을 먼저 등록하면 현황판을 사용할 수 있습니다.</p>
            <a
              href="/admin/rooms"
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >객실 추가하기 →</a>
          </div>
        )}

        {/* 테이블 뷰 */}
        {rooms.length > 0 && viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">호수</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">층</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">타입</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">담당자</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">체크인</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(room => {
                  const a = assignments.find(a => a.room_id === room.id)
                  const urgent = isUrgent(room, now, checkinAlertMinutes)
                  const cfg = STATUS_CONFIG[room.status]
                  const assignedName = a?.is_guest ? '게스트' : a?.staff?.name
                  return (
                    <tr
                      key={room.id}
                      onClick={() => openModal(room)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${urgent ? 'bg-red-50 hover:bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {room.number}호
                          {urgent && <span className="text-red-500 text-xs">⚠</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{room.floor}층</td>
                      <td className="px-4 py-3 text-slate-500">{room.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          {assignedName ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setQuickAssignRoom(quickAssignRoom === room.id ? null : room.id)}
                                className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors"
                              >{assignedName}</button>
                              <button
                                onClick={() => quickAssign(room.id, null)}
                                className="text-slate-300 hover:text-red-400 text-sm"
                              >✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setQuickAssignRoom(quickAssignRoom === room.id ? null : room.id)}
                              className="text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors border border-dashed border-slate-200 hover:border-blue-300"
                            >+ 배정</button>
                          )}
                          {quickAssignRoom === room.id && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
                              {staffList.map(s => (
                                <button key={s.id} onClick={() => quickAssign(room.id, s.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700">{s.name}</button>
                              ))}
                              <button onClick={() => quickAssign(room.id, 'guest')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-500">게스트</button>
                              {assignedName && <button onClick={() => quickAssign(room.id, null)} className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-500 border-t border-slate-100">배정 취소</button>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${urgent ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        {room.checkin_time ? fmtTime(room.checkin_time) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-slate-400 hover:text-slate-700">수정 →</span>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-slate-400 text-sm">객실이 없습니다</td>
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
              const urgent = isUrgent(room, now, checkinAlertMinutes)
              const cfg = STATUS_CONFIG[room.status]
              const assignedName = a?.is_guest ? '게스트' : a?.staff?.name

              return (
                <button
                  key={room.id}
                  onClick={() => openModal(room)}
                  className={`relative bg-white rounded-xl p-3 text-left border transition-all hover:shadow-md active:scale-95 ${
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
                    <div onClick={e => e.stopPropagation()}>
                      {assignedName ? (
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => setQuickAssignRoom(quickAssignRoom === room.id ? null : room.id)}
                            className="text-xs text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors truncate max-w-[70px]"
                          >{assignedName}</button>
                          <button onClick={() => quickAssign(room.id, null)} className="text-slate-300 hover:text-red-400 text-xs leading-none">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setQuickAssignRoom(quickAssignRoom === room.id ? null : room.id)}
                          className="text-xs text-slate-400 hover:text-blue-600 mt-1"
                        >+ 배정</button>
                      )}
                      {quickAssignRoom === room.id && (
                        <div className="absolute bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 min-w-[130px] left-0 top-full mt-1">
                          {staffList.map(s => (
                            <button key={s.id} onClick={() => quickAssign(room.id, s.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700">{s.name}</button>
                          ))}
                          <button onClick={() => quickAssign(room.id, 'guest')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-500">게스트</button>
                          {assignedName && <button onClick={() => quickAssign(room.id, null)} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-500 border-t border-slate-100">취소</button>}
                        </div>
                      )}
                    </div>
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
        )}
      </main>

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 flex items-center gap-3 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
        }`}>
          <span>{toast.msg}</span>
          {toast.retry && (
            <button
              onClick={() => { setToast(null); refetch() }}
              className="shrink-0 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
            >다시 시도</button>
          )}
        </div>
      )}

      {/* 체크인 일괄 등록 모달 */}
      {bulkCheckinOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-20 p-4" onClick={() => setBulkCheckinOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">체크인 일괄 등록</h2>
              <button
                onClick={() => {
                  const t: Record<string, string> = {}
                  rooms.forEach(r => { t[r.id] = '15:00' })
                  setBulkTimes(t)
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >전체 15:00</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {rooms.map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="w-16 font-semibold text-slate-900 text-sm">{r.number}호</span>
                  <span className="text-xs text-slate-400 w-6">{r.floor}층</span>
                  <input
                    type="time"
                    value={bulkTimes[r.id] ?? ''}
                    onChange={e => setBulkTimes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {bulkTimes[r.id] && (
                    <button onClick={() => setBulkTimes(prev => { const n = {...prev}; delete n[r.id]; return n })} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button onClick={() => setBulkCheckinOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">취소</button>
              <button onClick={handleBulkCheckin} disabled={bulkSaving} className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40">{bulkSaving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* AI 배정 추천 모달 */}
      {aiRecs && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-20 p-4" onClick={() => !aiApplying && setAiRecs(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">✦ AI 배정 추천</h2>
              <p className="text-xs text-slate-400 mt-0.5">체크인 임박 · 부하 균형 · 층 이동 최소화 기준</p>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {aiRecs.map(rec => {
                const room = rooms.find(r => r.id === rec.roomId)
                const staff = staffList.find(s => s.id === rec.staffId)
                return (
                  <div key={rec.roomId} className="flex items-start gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                    <span className="w-14 shrink-0 font-bold text-slate-900 text-sm">{room?.number ?? '?'}호</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-violet-700">{staff?.name ?? '알 수 없음'}</p>
                      {rec.reason && <p className="text-xs text-slate-500 mt-0.5">{rec.reason}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setAiRecs(null)}
                disabled={aiApplying}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >취소</button>
              <button
                onClick={applyAiRecommendations}
                disabled={aiApplying}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
              >{aiApplying ? '적용 중...' : '전체 적용'}</button>
            </div>
          </div>
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

                {/* AI-04: 청소 소요시간 예측 배지 */}
                {durationEstimate && (() => {
                  const estimatedDone = new Date(now.getTime() + durationEstimate.avgMinutes * 60_000)
                  const doneTime = estimatedDone.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                  if (!selectedRoom.checkin_time) {
                    return (
                      <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        평균 소요 {durationEstimate.avgMinutes}분 · 최근 {durationEstimate.sampleCount}건
                      </span>
                    )
                  }
                  const marginMs = new Date(selectedRoom.checkin_time).getTime() - estimatedDone.getTime()
                  const marginMin = Math.round(marginMs / 60_000)
                  if (marginMin >= 30) {
                    return (
                      <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        완료 예상 ~{doneTime} · 체크인까지 {marginMin}분 여유
                      </span>
                    )
                  }
                  if (marginMin >= 0) {
                    return (
                      <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        완료 예상 ~{doneTime} · 체크인 임박 (여유 {marginMin}분)
                      </span>
                    )
                  }
                  return (
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                      체크인 초과 예상 · 완료 예상 ~{doneTime}
                    </span>
                  )
                })()}
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
