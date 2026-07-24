'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import OnboardingChecklist from '@/components/OnboardingChecklist'
import { C, inputSt, selectSt, chipSt } from '@/lib/theme'
import { useToast } from '@/lib/hooks/useToast'
import {
  STATUS_CONFIG,
  isUrgent,
  fmtTime,
  toDatetimeLocal,
  predictedMinutes,
} from '@/lib/rooms'
import type { RoomStatus } from '@/lib/constants'

type Room = {
  id: string
  number: string
  floor: number
  type: string
  status: RoomStatus
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
type ViewMode = 'grid' | 'table'
type RtStatus = 'connected' | 'disconnected'

const STATUS_KEYS = Object.keys(STATUS_CONFIG) as RoomStatus[]

function DraggableStaffChip({ staffId, name }: { staffId: string; name: string }) {
  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('staffId', staffId)
        e.dataTransfer.setData('staffName', name)
      }}
      style={{
        padding: '6px 14px',
        background: `${C.accent}22`,
        border: `1.5px solid ${C.accent}55`,
        color: C.accent,
        borderRadius: 999, fontSize: 12, fontWeight: 700,
        cursor: 'grab', userSelect: 'none',
      }}
    >
      {name}
    </div>
  )
}

function DroppableRoomCard({ isOver, onDragOver, onDragLeave, onDrop, children, onClick }: {
  isOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        background: isOver ? `${C.accent}12` : C.card,
        border: `1px solid ${isOver ? C.accent : C.border}`,
        borderRadius: 12, padding: '13px 12px',
        textAlign: 'left', cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        outline: 'none', width: '100%',
        boxShadow: isOver ? `0 0 0 3px ${C.accent}28` : 'none',
      }}
    >
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: RoomStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.text,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }}/>
      {cfg.label}
    </span>
  )
}

interface Props {
  hotelId: string
  hotelName: string
  initialRooms: Room[]
  initialAssignments: Assignment[]
  staffList: Staff[]
  checkinAlertMinutes?: number
  subscriptionPlan?: string
  trialEndsAt?: string | null
}

export default function AdminDashboard({ hotelId, hotelName, initialRooms, initialAssignments, staffList }: Props) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [now, setNow] = useState(new Date())

  const [filterFloor, setFilterFloor]   = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterStaff, setFilterStaff]   = useState<string | null>(null)

  const [viewMode, setViewMode]             = useState<ViewMode>('table')
  const [selectedRoom, setSelectedRoom]     = useState<Room | null>(null)
  const [modalAssign, setModalAssign]       = useState<string>('')
  const [modalStatus, setModalStatus]       = useState<string>('')
  const [modalCheckinTime, setModalCheckinTime] = useState<string>('')
  const [modalMemo, setModalMemo]           = useState('')
  const [saving, setSaving]                 = useState(false)
  const { toast, showToast }                = useToast()
  const [rtStatus, setRtStatus]             = useState<RtStatus>('connected')
  const [smartAssigns, setSmartAssigns]     = useState<{ roomId: string; staffId: string; reason: string }[]>([])
  const [smartLoading, setSmartLoading]     = useState(false)
  const [showSmartAssign, setShowSmartAssign] = useState(false)
  const [dragMode, setDragMode]             = useState(false)
  const [overRoomId, setOverRoomId]         = useState<string | null>(null)

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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRtStatus('connected')
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setRtStatus('disconnected')
      })
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

  async function handleDrop(roomId: string, e: React.DragEvent) {
    e.preventDefault()
    setOverRoomId(null)
    const staffId = e.dataTransfer.getData('staffId')
    if (!staffId) return

    // 즉시 UI 반영 (낙관적 업데이트)
    const staff = staffList.find(s => s.id === staffId) ?? null
    const prevAssignments = assignments
    setAssignments(prev => [
      ...prev.filter(a => a.room_id !== roomId),
      { id: `optimistic-${Date.now()}`, room_id: roomId, staff_id: staffId, is_guest: false, assigned_at: new Date().toISOString(), staff },
    ])
    showToast('배정 완료', 'success')

    try {
      const res = await fetch('/api/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, staffId, isGuest: false, unassign: false }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setAssignments(prevAssignments) // 실패 시 롤백
      showToast('배정에 실패했습니다.')
    }
  }

  async function handleSmartAssign() {
    setSmartLoading(true)
    try {
      const res = await fetch('/api/admin/ai-assign', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setSmartAssigns(data.recommendations ?? [])
        setShowSmartAssign(true)
      }
    } catch {
      showToast('AI 배정 분석에 실패했습니다.')
    } finally {
      setSmartLoading(false)
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
    <>
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px 80px' }} className="md:pb-6">

        {/* Realtime 연결 끊김 배너 */}
        {rtStatus === 'disconnected' && (
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(251,191,36,0.07)', border: `1px solid rgba(251,191,36,0.18)`, borderRadius: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: C.amber, flex: 1 }}>실시간 연결이 끊겼습니다. 재연결 중...</p>
            <button onClick={refetch} style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>새로고침</button>
          </div>
        )}

        <OnboardingChecklist
          roomCount={rooms.length}
          staffCount={staffList.length}
          hasAssignment={assignments.length > 0}
        />

        {/* 상태 카운터 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {STATUS_KEYS.map(s => {
            const cfg = STATUS_CONFIG[s]
            const active = filterStatus === s
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(active ? null : s)}
                style={{
                  background: active ? cfg.bg : C.card,
                  border: `1px solid ${active ? cfg.dot + '60' : C.border}`,
                  borderRadius: 10, padding: '12px 14px',
                  textAlign: 'left', cursor: 'pointer', outline: 'none',
                  transition: 'all 0.15s', boxShadow: active ? `0 0 0 3px ${cfg.dot}18` : 'none',
                  fontFamily: 'inherit',
                }}
              >
                <p style={{ fontSize: 22, fontWeight: 800, color: active ? cfg.text : C.text, letterSpacing: '-0.04em', marginBottom: 6 }}>{counts[s]}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }}/>
                  <span style={{ fontSize: 11, color: C.textDim }}>{cfg.label}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* 필터 + 뷰모드 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterFloor(null)}
              style={{
                ...chipSt,
                background: filterFloor === null ? C.text : C.card,
                color: filterFloor === null ? C.bg : C.textMid,
                borderColor: filterFloor === null ? 'transparent' : C.border,
              }}
            >전체</button>
            {floors.map(f => (
              <button
                key={f}
                onClick={() => setFilterFloor(filterFloor === f ? null : f)}
                style={{
                  ...chipSt,
                  background: filterFloor === f ? C.text : C.card,
                  color: filterFloor === f ? C.bg : C.textMid,
                  borderColor: filterFloor === f ? 'transparent' : C.border,
                }}
              >{f}층</button>
            ))}
          </div>

          <select
            value={filterStaff ?? ''}
            onChange={e => setFilterStaff(e.target.value || null)}
            style={{
              ...chipSt, padding: '5px 10px',
              background: C.card, color: C.textMid,
            }}
          >
            <option value="">전체 직원</option>
            <option value="none">미배정</option>
            <option value="guest">게스트</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <button
              onClick={() => {
                const next = !dragMode
                setDragMode(next)
                if (next) setViewMode('grid')
              }}
              style={{
                ...chipSt,
                background: dragMode ? C.accent : C.card,
                color: dragMode ? '#fff' : C.textMid,
                borderColor: dragMode ? 'transparent' : C.border,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
                <path d="M7 2a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM7 6a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM7 10a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM3 2a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM3 6a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM3 10a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" />
              </svg>
              드래그 배정
            </button>
            <button
              onClick={handleSmartAssign}
              disabled={smartLoading}
              style={{
                ...chipSt,
                background: 'rgba(129,140,248,0.08)',
                color: C.violet,
                borderColor: 'rgba(129,140,248,0.2)',
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: smartLoading ? 0.5 : 1,
              }}
            >
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
                <path d="M8 1.5a.75.75 0 0 1 .75.75V4.5h2.25a.75.75 0 0 1 0 1.5H8.75v2.25a.75.75 0 0 1-1.5 0V6H5a.75.75 0 0 1 0-1.5h2.25V2.25A.75.75 0 0 1 8 1.5ZM4.5 8.75A.75.75 0 0 1 5.25 8h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75ZM3 11.25A.75.75 0 0 1 3.75 10.5h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 11.25Z" />
              </svg>
              {smartLoading ? '분석 중...' : 'AI 배정'}
            </button>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500 }}>{filtered.length}개</span>

            {/* View mode toggle */}
            <div style={{ display: 'flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {(['table', 'grid'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '5px 10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: viewMode === mode ? C.text : 'transparent',
                    color: viewMode === mode ? C.bg : C.textMid,
                    transition: 'all 0.15s',
                  }}
                >
                  {mode === 'table' ? (
                    <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 13, height: 13 }}>
                      <rect x="1" y="3" width="14" height="2.5" rx="1" />
                      <rect x="1" y="7" width="14" height="2.5" rx="1" />
                      <rect x="1" y="11" width="14" height="2.5" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 13, height: 13 }}>
                      <rect x="1" y="1" width="6" height="6" rx="1.5" />
                      <rect x="9" y="1" width="6" height="6" rx="1.5" />
                      <rect x="1" y="9" width="6" height="6" rx="1.5" />
                      <rect x="9" y="9" width="6" height="6" rx="1.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 객실 없음 */}
        {rooms.length === 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: C.surface, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth={1.5} style={{ width: 22, height: 22 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5V19h18v-8.5M3 19v-2h18v2M2 10.5h20M8 10.5V7a4 4 0 0 1 8 0v3.5" />
              </svg>
            </div>
            <p style={{ color: C.text, fontWeight: 700, marginBottom: 6 }}>등록된 객실이 없습니다</p>
            <p style={{ fontSize: 13, color: C.textDim, marginBottom: 20 }}>객실을 먼저 등록하면 현황판을 사용할 수 있습니다.</p>
            <a
              href="/admin/onboarding"
              style={{
                display: 'inline-flex', alignItems: 'center', padding: '10px 22px',
                background: C.accent, color: '#fff', borderRadius: 10,
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                boxShadow: `0 0 20px ${C.accent}44`,
              }}
            >시작하기</a>
          </div>
        )}

        {/* 테이블 뷰 */}
        {rooms.length > 0 && viewMode === 'table' && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['호수', '층', '타입', '상태', '담당자', '체크인', '예상', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 600, color: C.textDim,
                      letterSpacing: '0.04em',
                      display: i === 2 ? undefined : undefined,
                    }}
                    className={i === 2 ? 'hidden sm:table-cell' : i === 4 ? 'hidden md:table-cell' : i === 6 ? 'hidden lg:table-cell' : ''}
                    >{h}</th>
                  ))}
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
                      style={{
                        cursor: 'pointer',
                        background: urgent ? 'rgba(248,113,113,0.04)' : 'transparent',
                        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = urgent ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.025)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = urgent ? 'rgba(248,113,113,0.04)' : 'transparent' }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: C.text }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {room.number}호
                          {urgent && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              padding: '1px 7px', borderRadius: 999,
                              background: 'rgba(248,113,113,0.12)', color: C.red,
                              fontSize: 10, fontWeight: 700,
                            }}>긴급</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: C.textMid }}>{room.floor}층</td>
                      <td style={{ padding: '12px 16px', color: C.textMid }} className="hidden sm:table-cell">{room.type}</td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={room.status}/></td>
                      <td style={{ padding: '12px 16px', color: C.text, fontWeight: 500 }} className="hidden md:table-cell">
                        {assignedName ?? <span style={{ color: C.textDim }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: urgent ? C.red : C.textMid }}>
                        {room.checkin_time ? fmtTime(room.checkin_time) : <span style={{ color: C.textDim }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }} className="hidden lg:table-cell">
                        {(room.status === 'dirty' || room.status === 'cleaning') && (
                          <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500 }}>~{predictedMinutes(room.type)}분</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <svg viewBox="0 0 20 20" fill={C.textDim} style={{ width: 14, height: 14, display: 'inline-block' }}>
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                        </svg>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px 0', color: C.textDim, fontSize: 13 }}>해당하는 객실이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 카드 그리드 뷰 (드래그 배정 포함) */}
        {rooms.length > 0 && viewMode === 'grid' && (
          <>
            {/* 드래그 배정 직원 패널 */}
            {dragMode && staffList.length > 0 && (
              <div style={{ background: `${C.accent}0d`, border: `1px solid ${C.accent}25`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginRight: 4 }}>직원 이름을 잡고 아래 객실에 드래그하세요</span>
                {staffList.map(s => <DraggableStaffChip key={s.id} staffId={s.id} name={s.name} />)}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" style={{ gap: 8 }}>
              {filtered.map(room => {
                const a = assignments.find(a => a.room_id === room.id)
                const urgent = isUrgent(room, now)
                const cfg = STATUS_CONFIG[room.status]
                const assignedName = a?.is_guest ? '게스트' : a?.staff?.name
                const isOver = overRoomId === room.id && dragMode

                return (
                  <DroppableRoomCard
                    key={room.id}
                    isOver={isOver}
                    onDragOver={e => { if (dragMode) { e.preventDefault(); setOverRoomId(room.id) } }}
                    onDragLeave={() => setOverRoomId(null)}
                    onDrop={e => handleDrop(room.id, e)}
                    onClick={() => openModal(room)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{room.number}</span>
                      {urgent && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, marginTop: 2, flexShrink: 0, boxShadow: `0 0 6px ${C.red}` }}/>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }}/>
                      <span style={{ fontSize: 11, fontWeight: 600, color: cfg.text }}>{cfg.label}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <p style={{ fontSize: 10, color: C.textDim }}>{room.floor}층</p>
                      {assignedName && <p style={{ fontSize: 11, color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignedName}</p>}
                      {room.checkin_time && (
                        <p style={{ fontSize: 11, fontWeight: 600, color: urgent ? C.red : C.textMid }}>CI {fmtTime(room.checkin_time)}</p>
                      )}
                    </div>
                  </DroppableRoomCard>
                )
              })}
              {filtered.length === 0 && (
                <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: C.textDim, fontSize: 13 }}>해당하는 객실이 없습니다</p>
              )}
            </div>
          </>
        )}
      </main>

      {/* AI 스마트 배정 모달 */}
      {showSmartAssign && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 }}
          className="sm:items-center"
          onClick={() => setShowSmartAssign(false)}
        >
          <div
            style={{ background: C.surface, border: `1px solid ${C.border}`, width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', overflow: 'hidden', boxShadow: '0 -24px 80px rgba(0,0,0,0.6)' }}
            className="sm:rounded-2xl sm:max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }} className="sm:hidden">
              <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999 }}/>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 14px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>✨</span>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>AI 배정 추천</h2>
              </div>
              <button
                onClick={() => setShowSmartAssign(false)}
                style={{ width: 28, height: 28, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: C.textMid, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 13, height: 13 }}>
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '12px 20px', maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {smartAssigns.length === 0 ? (
                <p style={{ textAlign: 'center', color: C.textDim, fontSize: 13, padding: '32px 0' }}>추천할 배정이 없습니다</p>
              ) : (
                smartAssigns.map((rec, idx) => {
                  const room = rooms.find(r => r.id === rec.roomId)
                  const staff = staffList.find(s => s.id === rec.staffId)
                  if (!room || !staff) return null
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '12px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{room.number}호 → {staff.name}</p>
                        <p style={{ fontSize: 11, color: C.textMid, marginTop: 3, lineHeight: 1.5 }}>{rec.reason}</p>
                      </div>
                      <button
                        onClick={async () => {
                          await fetch('/api/admin/assign', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ roomId: rec.roomId, staffId: rec.staffId, isGuest: false, unassign: false }),
                          })
                          await refetch()
                          setSmartAssigns(prev => prev.filter((_, i) => i !== idx))
                          if (smartAssigns.length <= 1) setShowSmartAssign(false)
                          showToast(`${room.number}호 배정 완료`, 'success')
                        }}
                        style={{ flexShrink: 0, padding: '7px 14px', background: C.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      >적용</button>
                    </div>
                  )
                })
              )}
            </div>
            <div style={{ padding: '8px 20px 20px' }}>
              <button
                onClick={() => setShowSmartAssign(false)}
                style={{ width: '100%', padding: '12px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}
              >닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          padding: '11px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff',
          background: toast.type === 'error' ? C.red : C.green,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50, whiteSpace: 'nowrap',
          animation: 'fadeInUp 0.3s ease',
        }} className="md:bottom-6">
          {toast.msg}
        </div>
      )}

      {/* 바텀시트 모달 */}
      {selectedRoom && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 }}
          className="sm:items-center"
          onClick={() => setSelectedRoom(null)}
        >
          <div
            style={{ background: C.surface, border: `1px solid ${C.border}`, width: '100%', maxWidth: 400, borderRadius: '20px 20px 0 0', overflow: 'hidden', boxShadow: '0 -24px 80px rgba(0,0,0,0.6)' }}
            className="sm:rounded-2xl sm:max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            {/* 핸들 */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }} className="sm:hidden">
              <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999 }}/>
            </div>

            {/* 헤더 */}
            <div style={{ padding: '14px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{selectedRoom.number}호</h2>
                <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{selectedRoom.floor}층 · {selectedRoom.type}</p>
              </div>
              <StatusBadge status={selectedRoom.status}/>
            </div>

            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 담당 직원 배정 */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>담당 직원</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={modalAssign}
                    onChange={e => setModalAssign(e.target.value)}
                    style={{ ...selectSt, flex: 1 }}
                    onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = C.accent }}
                    onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = C.border }}
                  >
                    <option value="">미배정</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="guest">게스트 (일일알바)</option>
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={saving}
                    style={{ padding: '0 18px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'inherit' }}
                  >배정</button>
                </div>
              </div>

              {/* 체크인 시간 */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>체크인 시간</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="datetime-local"
                    value={modalCheckinTime}
                    onChange={e => setModalCheckinTime(e.target.value)}
                    style={{ ...inputSt, flex: 1 }}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.accent }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
                  />
                  {modalCheckinTime && (
                    <button onClick={() => setModalCheckinTime('')} style={{ fontSize: 11, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>제거</button>
                  )}
                </div>
              </div>

              {/* 상태 변경 */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>상태 변경</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  {STATUS_KEYS.map(s => {
                    const cfg = STATUS_CONFIG[s]
                    const active = modalStatus === s
                    return (
                      <button
                        key={s}
                        onClick={() => setModalStatus(s)}
                        style={{
                          padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                          background: active ? cfg.bg : C.card,
                          color: active ? cfg.text : C.textMid,
                          border: `1px solid ${active ? cfg.dot + '50' : C.border}`,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        }}
                      >{cfg.label}</button>
                    )
                  })}
                </div>
              </div>

              {/* 메모 */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  메모 <span style={{ color: C.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(선택)</span>
                </p>
                <textarea
                  value={modalMemo}
                  onChange={e => setModalMemo(e.target.value)}
                  placeholder="특이사항을 입력하세요..."
                  rows={2}
                  style={{
                    ...inputSt, resize: 'none',
                  } as React.CSSProperties}
                  onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = C.accent }}
                  onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = C.border }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSelectedRoom(null)}
                  style={{ flex: 1, padding: '13px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}
                >닫기</button>
                <button
                  onClick={handleStatusSave}
                  disabled={saving}
                  style={{ flex: 1, padding: '13px 0', background: C.text, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.bg, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'inherit' }}
                >{saving ? '저장 중...' : '저장'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
