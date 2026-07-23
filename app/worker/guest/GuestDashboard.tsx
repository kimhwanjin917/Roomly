'use client'

import { useState, useCallback } from 'react'
import RoomlyMark from '@/components/RoomlyMark'
import { useToast } from '@/lib/hooks/useToast'
import { useNow, useOnlineStatus, useRealtimeRefetch } from '@/lib/hooks/useLive'
import { isUrgent, isFinished, fmtTime, typeLabel } from '@/lib/rooms'
import type { RoomStatus } from '@/lib/constants'

type Room = {
  id: string
  number: string
  floor: number
  type: string
  status: RoomStatus
  checkin_time: string | null
}

type Assignment = { id: string; assigned_at: string; rooms: Room }

const WATCHED_TABLES = ['rooms', 'assignments'] as const

export default function GuestDashboard({ initialAssignments, token }: { hotelId: string; initialAssignments: Assignment[]; token: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [memoRoom, setMemoRoom] = useState<Assignment | null>(null)
  const [memo, setMemo] = useState('')

  const now = useNow()
  const { toast, showToast } = useToast()

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/guest/assignments')
      if (res.ok) setAssignments(await res.json())
    } catch {
      // 네트워크 오류 시 기존 데이터 유지
    }
  }, [])

  const isOnline = useOnlineStatus(refetch)
  useRealtimeRefetch({ channel: 'guest-realtime', tables: WATCHED_TABLES, onChange: refetch, token })

  async function changeStatus(assignment: Assignment, status: string, memoText?: string) {
    const roomId = assignment.rooms.id
    setLoading(l => ({ ...l, [roomId]: true }))
    try {
      const res = await fetch('/api/guest/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, assignmentId: assignment.id, status, memo: memoText ?? null }),
      })
      if (!res.ok) throw new Error()
      await refetch()
    } catch {
      showToast('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(l => ({ ...l, [roomId]: false }))
    }
  }

  const sorted = [...assignments].sort((a, b) => {
    const ra = a.rooms, rb = b.rooms
    const doneA = isFinished(ra.status)
    const doneB = isFinished(rb.status)
    if (doneA !== doneB) return doneA ? 1 : -1
    const urgA = isUrgent(ra, now), urgB = isUrgent(rb, now)
    if (urgA !== urgB) return urgA ? -1 : 1
    if (ra.checkin_time && rb.checkin_time) return new Date(ra.checkin_time).getTime() - new Date(rb.checkin_time).getTime()
    return 0
  })

  const doneCount = assignments.filter(a => isFinished(a.rooms.status)).length
  const totalCount = assignments.length

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-4 pt-10 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <RoomlyMark size={20} />
              <p className="text-xs text-slate-400">일일 근무자</p>
            </div>
            <p className="text-xl font-bold text-slate-900">오늘의 청소 목록</p>
            <p className="text-xs text-slate-400 mt-0.5">{now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} · 자정에 세션 만료</p>
          </div>
          {totalCount > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{doneCount}<span className="text-base text-slate-400 font-normal">/{totalCount}</span></p>
              <p className="text-xs text-slate-400">완료</p>
            </div>
          )}
        </div>
        {totalCount > 0 && (
          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${doneCount === totalCount ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-sm font-medium text-center py-2 px-4">
          오프라인 상태입니다. 마지막 데이터를 표시 중입니다.
        </div>
      )}

      {/* 배정 목록 */}
      <div className="px-4 pt-4 space-y-2.5">
        {sorted.length === 0 && (
          <div className="text-center py-24 text-slate-400 text-sm">배정된 객실이 없습니다</div>
        )}

        {sorted.map(assignment => {
          const room = assignment.rooms
          const urgent = isUrgent(room, now)
          const isLoading = loading[room.id]
          const isDone = room.status === 'done'
          const isInspect = room.status === 'inspect'
          const finished = isDone || isInspect

          return (
            <div
              key={assignment.id}
              className={`bg-white rounded-2xl border transition-all ${
                urgent
                  ? 'border-red-300 ring-1 ring-red-200'
                  : finished
                  ? 'border-slate-100 opacity-60'
                  : 'border-slate-200'
              }`}
            >
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-bold text-slate-900">{room.number}호</span>
                    <div className="flex flex-col">
                      {urgent && <span className="text-xs font-semibold text-red-500 leading-tight">긴급</span>}
                      {isDone && <span className="text-xs font-semibold text-emerald-600 leading-tight">완료</span>}
                      {isInspect && <span className="text-xs font-semibold text-violet-600 leading-tight">점검대기</span>}
                      {!finished && !urgent && (
                        <span className="text-xs text-slate-400 leading-tight">{room.status === 'cleaning' ? '청소중' : '대기'}</span>
                      )}
                    </div>
                  </div>
                  {room.checkin_time && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">체크인</p>
                      <p className={`text-sm font-bold leading-tight ${urgent ? 'text-red-500' : 'text-slate-700'}`}>
                        {fmtTime(room.checkin_time)}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{room.floor}층 · {typeLabel(room.type)}</p>
              </div>

              {!finished && (
                <div className="px-3 pb-3 space-y-2">
                  {room.status === 'dirty' && (
                    <button
                      onClick={() => changeStatus(assignment, 'cleaning')}
                      disabled={isLoading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
                    >
                      {isLoading ? '처리 중...' : '청소 시작'}
                    </button>
                  )}
                  {room.status === 'cleaning' && (
                    <>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setMemoRoom(assignment); setMemo('') }}
                          disabled={isLoading}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
                        >완료</button>
                        <button
                          onClick={() => changeStatus(assignment, 'inspect')}
                          disabled={isLoading}
                          className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
                        >점검 필요</button>
                      </div>
                      <button
                        onClick={() => changeStatus(assignment, 'dirty')}
                        disabled={isLoading}
                        className="w-full py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >대기중으로 되돌리기</button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 완료 메모 모달 */}
      {memoRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-20" onClick={() => setMemoRoom(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h2 className="font-bold text-slate-900 text-base mb-0.5">{memoRoom.rooms.number}호 완료 처리</h2>
            <p className="text-xs text-slate-400 mb-4">특이사항이 있으면 메모를 남겨주세요 (선택)</p>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="예: 욕실 수건 추가 요청, 미니바 비어있음..."
              rows={3}
              autoFocus
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setMemoRoom(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">취소</button>
              <button
                onClick={async () => { if (!memoRoom) return; await changeStatus(memoRoom, 'done', memo); setMemoRoom(null) }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >완료 확인</button>
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
