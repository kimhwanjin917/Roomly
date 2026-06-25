'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientWithToken } from '@/lib/supabase/client'

type RoomStatus = 'dirty' | 'cleaning' | 'done' | 'inspect'

type Room = {
  id: string
  number: string
  floor: number
  type: string
  status: RoomStatus
}

type Toast = { msg: string; type: 'success' | 'error' }

interface Props {
  staffId: string
  hotelId: string
  staffName: string
  initialRooms: Room[]
  token: string
}

const STATUS_CONFIG: Record<RoomStatus, { label: string; bg: string; text: string }> = {
  dirty:    { label: '더티',   bg: 'bg-slate-100',   text: 'text-slate-500' },
  cleaning: { label: '청소중', bg: 'bg-amber-50',    text: 'text-amber-600' },
  done:     { label: '완료',   bg: 'bg-emerald-50',  text: 'text-emerald-600' },
  inspect:  { label: '점검',   bg: 'bg-violet-50',   text: 'text-violet-600' },
}

export default function DirtyDashboard({ staffId, hotelId, staffName, initialRooms, token }: Props) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<Toast | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const now = new Date()

  function showToast(msg: string, type: Toast['type'] = 'success') {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/worker/dirty/rooms?hotelId=${hotelId}`)
      if (res.ok) setRooms(await res.json())
    } catch { /* keep existing */ }
  }, [hotelId])

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); refetch() }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refetch])

  useEffect(() => {
    const supabase = createClientWithToken(token)
    const channel = supabase.channel('dirty-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, refetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch, token])

  async function markDirty(room: Room) {
    if (room.status === 'dirty' || room.status === 'cleaning') return
    setLoading(l => ({ ...l, [room.id]: true }))
    try {
      const res = await fetch('/api/worker/dirty/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      })
      if (!res.ok) throw new Error()
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: 'dirty' } : r))
      showToast(`${room.number}호 더티 처리 완료`)
    } catch {
      showToast('저장 실패. 다시 시도해주세요.', 'error')
    } finally {
      setLoading(l => ({ ...l, [room.id]: false }))
    }
  }

  // Group by floor
  const byFloor = rooms.reduce<Record<number, Room[]>>((acc, r) => {
    acc[r.floor] = acc[r.floor] ?? []
    acc[r.floor].push(r)
    return acc
  }, {})

  const dirtyCount = rooms.filter(r => r.status === 'dirty').length
  const pendingCount = rooms.filter(r => r.status === 'done' || r.status === 'inspect').length

  return (
    <div className="min-h-screen bg-toss-bg pb-10">

      {/* 헤더 */}
      <div className="bg-white px-5 pt-12 pb-6">
        <p className="text-xs text-[#B0B8C1] font-medium mb-1.5">
          {now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
        <h1 className="text-[22px] font-bold text-[#191919] leading-tight mb-5">
          안녕하세요,<br />{staffName}님 👋
        </h1>

        {/* 요약 카운터 */}
        <div className="flex gap-3">
          <div className="flex-1 bg-[#F2F4F6] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#191919] leading-none">{dirtyCount}</p>
            <p className="text-xs text-[#B0B8C1] font-medium mt-1">더티 완료</p>
          </div>
          <div className="flex-1 bg-[#FFF8EB] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-500 leading-none">{pendingCount}</p>
            <p className="text-xs text-amber-400 font-medium mt-1">더티 대기</p>
          </div>
          <div className="flex-1 bg-[#EBF3FF] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-toss-blue leading-none">{rooms.length}</p>
            <p className="text-xs text-toss-blue/60 font-medium mt-1">전체 객실</p>
          </div>
        </div>
      </div>

      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="bg-toss-warn/10 px-5 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-toss-warn" />
          <p className="text-sm font-semibold text-[#B07800]">오프라인 상태입니다.</p>
        </div>
      )}

      {/* 층별 객실 그리드 */}
      <div className="px-4 pt-4 space-y-3">
        {Object.keys(byFloor)
          .sort((a, b) => Number(a) - Number(b))
          .map(floor => (
            <div key={floor} className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-3" style={{ borderBottom: '1px solid #F2F4F6' }}>
                <span className="text-xs font-bold text-[#B0B8C1]">{floor}층</span>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {byFloor[Number(floor)].map(room => {
                  const canMark = room.status === 'done' || room.status === 'inspect'
                  const isAlreadyDirty = room.status === 'dirty'
                  const isCleaning = room.status === 'cleaning'
                  const isLoading = loading[room.id]
                  const cfg = STATUS_CONFIG[room.status]

                  return (
                    <button
                      key={room.id}
                      onClick={() => canMark && markDirty(room)}
                      disabled={!canMark || isLoading}
                      className={`relative rounded-xl p-3 text-left transition-all active:scale-95 ${
                        canMark
                          ? 'bg-[#FFF8EB] border-2 border-amber-200 hover:bg-amber-50 active:bg-amber-100'
                          : isAlreadyDirty
                          ? 'bg-slate-50 border-2 border-slate-100'
                          : 'bg-[#F2F4F6] border-2 border-transparent'
                      } ${isLoading ? 'opacity-50' : ''}`}
                    >
                      <p className={`text-base font-bold leading-none mb-1.5 ${
                        canMark ? 'text-amber-700' : isAlreadyDirty ? 'text-slate-400' : 'text-[#B0B8C1]'
                      }`}>
                        {room.number}
                      </p>

                      {isLoading ? (
                        <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      ) : canMark ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md">
                          더티 ↓
                        </span>
                      ) : isAlreadyDirty ? (
                        <span className="text-[10px] font-semibold text-slate-400">
                          ✓ 더티
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
      </div>

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3.5 rounded-2xl text-sm font-bold text-white shadow-modal z-50 whitespace-nowrap transition-all ${
          toast.type === 'error' ? 'bg-toss-error' : 'bg-toss-success'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
