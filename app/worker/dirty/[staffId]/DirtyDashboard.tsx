'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/lib/hooks/useToast'
import { useNow, useOnlineStatus, useRealtimeRefetch } from '@/lib/hooks/useLive'
import { isFinished } from '@/lib/rooms'
import type { RoomStatus } from '@/lib/constants'

type Room = {
  id: string
  number: string
  floor: number
  type: string
  status: RoomStatus
  checkin_time: string | null
}

const WATCHED_TABLES = ['rooms'] as const

const STATUS_LABELS: Record<Room['status'], string> = {
  dirty: '대기', cleaning: '청소중', done: '완료', inspect: '점검대기',
}

const STATUS_STYLES: Record<Room['status'], string> = {
  dirty: 'bg-slate-100 border-slate-200 text-slate-400',
  cleaning: 'bg-blue-50 border-blue-200 text-blue-600',
  done: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  inspect: 'bg-violet-50 border-violet-300 text-violet-700',
}

interface Props {
  staffId: string
  hotelId: string
  staffName: string
  initialRooms: Room[]
  token: string
}

export default function DirtyDashboard({ staffId, hotelId, staffName, initialRooms, token }: Props) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [confirmRoom, setConfirmRoom] = useState<Room | null>(null)

  const now = useNow()
  const { toast, showToast } = useToast()

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/worker/dirty/rooms')
      if (res.status === 401) {
        window.location.href = '/login?error=session_expired'
        return
      }
      if (res.ok) setRooms(await res.json())
    } catch {
      // 네트워크 오류 시 기존 데이터 유지
    }
  }, [])

  const isOnline = useOnlineStatus(refetch)
  useRealtimeRefetch({ channel: 'dirty-worker-realtime', tables: WATCHED_TABLES, onChange: refetch, token })

  async function markDirty(room: Room) {
    setLoading(l => ({ ...l, [room.id]: true }))
    try {
      const res = await fetch('/api/worker/dirty/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      })
      if (res.status === 401) {
        window.location.href = '/login?error=session_expired'
        return
      }
      if (!res.ok) throw new Error()
      showToast(`${room.number}호를 더티 처리했습니다`, 'success')
      await refetch()
    } catch {
      showToast('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(l => ({ ...l, [room.id]: false }))
      setConfirmRoom(null)
    }
  }

  // 층별 그룹핑 (높은 층부터)
  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => b - a)
  const clickableCount = rooms.filter(r => isFinished(r.status)).length

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-4 pt-10 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">{now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
            <p className="text-xl font-bold text-slate-900">안녕하세요, {staffName}님</p>
            <p className="text-xs text-amber-600 font-medium mt-1">더티 처리 담당 · 완료/점검대기 방을 눌러 더티로 전환하세요</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{clickableCount}</p>
            <p className="text-xs text-slate-400">처리 가능</p>
          </div>
        </div>
      </div>

      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-sm font-medium text-center py-2 px-4">
          오프라인 상태입니다. 마지막 데이터를 표시 중입니다.
        </div>
      )}

      {/* 층별 객실 그리드 */}
      <div className="px-4 pt-4 space-y-5">
        {rooms.length === 0 && (
          <div className="text-center py-24 text-slate-400 text-sm">등록된 객실이 없습니다</div>
        )}

        {floors.map(floor => (
          <div key={floor}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{floor}층</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {rooms.filter(r => r.floor === floor).map(room => {
                const clickable = isFinished(room.status)
                const isLoading = loading[room.id]
                return (
                  <button
                    key={room.id}
                    onClick={() => clickable && setConfirmRoom(room)}
                    disabled={!clickable || isLoading}
                    className={`rounded-xl border px-2 py-3 text-center transition-all ${STATUS_STYLES[room.status]} ${
                      clickable ? 'active:scale-95 cursor-pointer' : 'cursor-default opacity-70'
                    } ${isLoading ? 'opacity-40' : ''}`}
                  >
                    <p className="text-sm font-bold">{room.number}</p>
                    <p className="text-[10px] leading-tight mt-0.5">{STATUS_LABELS[room.status]}</p>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 더티 처리 확인 모달 */}
      {confirmRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-20" onClick={() => setConfirmRoom(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h2 className="font-bold text-slate-900 text-base mb-0.5">{confirmRoom.number}호 더티 처리</h2>
            <p className="text-xs text-slate-400 mb-5">
              현재 상태: {STATUS_LABELS[confirmRoom.status]} → 체크아웃 후 청소가 필요한 방으로 전환합니다
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRoom(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >취소</button>
              <button
                onClick={() => markDirty(confirmRoom)}
                disabled={loading[confirmRoom.id]}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
              >{loading[confirmRoom.id] ? '처리 중...' : '더티 처리'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
