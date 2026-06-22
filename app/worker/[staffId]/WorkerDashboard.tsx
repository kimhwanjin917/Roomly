'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientWithToken } from '@/lib/supabase/client'

type Room = {
  id: string
  number: string
  floor: number
  type: string
  status: 'dirty' | 'cleaning' | 'done' | 'inspect'
  checkin_time: string | null
}

type Assignment = {
  id: string
  assigned_at: string
  rooms: Room
}

type Toast = { msg: string; type: 'error' | 'success' }

const TYPE_LABELS: Record<string, string> = {
  single: '싱글', double: '더블', suite: '스위트', other: '기타',
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

interface Props {
  staffId: string
  hotelId: string
  staffName: string
  initialAssignments: Assignment[]
  token: string
}

export default function WorkerDashboard({ staffId, staffName, initialAssignments, token }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [memoRoom, setMemoRoom] = useState<Assignment | null>(null)
  const [memo, setMemo] = useState('')
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
    try {
      const res = await fetch(`/api/worker/assignments?staffId=${staffId}`)
      if (res.ok) setAssignments(await res.json())
    } catch {
      // 네트워크 오류 시 기존 데이터 유지 (Realtime이 재연결 시 갱신)
    }
  }, [staffId])

  // Realtime 구독 (rooms·assignments 변경 시 즉시 refetch)
  useEffect(() => {
    const supabase = createClientWithToken(token)
    const channel = supabase.channel('worker-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, refetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch, token])

  async function changeStatus(assignment: Assignment, status: string, memoText?: string) {
    const roomId = assignment.rooms.id
    setLoading(l => ({ ...l, [roomId]: true }))
    try {
      const res = await fetch('/api/worker/status', {
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

  function handleDone(assignment: Assignment) {
    setMemoRoom(assignment)
    setMemo('')
  }

  async function confirmDone() {
    if (!memoRoom) return
    await changeStatus(memoRoom, 'done', memo)
    setMemoRoom(null)
  }

  const sorted = [...assignments].sort((a, b) => {
    const ra = a.rooms, rb = b.rooms
    const doneA = ra.status === 'done' || ra.status === 'inspect'
    const doneB = rb.status === 'done' || rb.status === 'inspect'
    if (doneA !== doneB) return doneA ? 1 : -1
    const urgA = isUrgent(ra, now), urgB = isUrgent(rb, now)
    if (urgA !== urgB) return urgA ? -1 : 1
    if (ra.checkin_time && rb.checkin_time) return new Date(ra.checkin_time).getTime() - new Date(rb.checkin_time).getTime()
    if (ra.checkin_time) return -1
    if (rb.checkin_time) return 1
    return 0
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-5">
        <p className="text-lg font-bold text-gray-900">안녕하세요, {staffName}님</p>
        <p className="text-sm text-gray-400 mt-0.5">{now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
      </div>

      {/* 배정 목록 */}
      <div className="px-4 pt-4 space-y-3">
        {sorted.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm">배정된 객실이 없습니다</div>
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
              className={`bg-white rounded-2xl p-4 border-2 transition-all ${
                urgent ? 'border-red-400' : finished ? 'border-transparent opacity-50' : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900">{room.number}호</span>
                    {urgent && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">⚠ 긴급</span>}
                    {isDone && <span className="bg-green-100 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">완료</span>}
                    {isInspect && <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">점검대기</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{room.floor}층 · {TYPE_LABELS[room.type] ?? room.type}</p>
                </div>
                {room.checkin_time && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">체크인</p>
                    <p className={`text-sm font-semibold ${urgent ? 'text-red-500' : 'text-gray-700'}`}>
                      {fmtTime(room.checkin_time)}
                    </p>
                  </div>
                )}
              </div>

              {!finished && (
                <div className="flex gap-2 flex-wrap">
                  {room.status === 'dirty' && (
                    <button
                      onClick={() => changeStatus(assignment, 'cleaning')}
                      disabled={isLoading}
                      className="flex-1 py-2.5 bg-yellow-400 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                    >청소 시작</button>
                  )}
                  {room.status === 'cleaning' && (
                    <>
                      <button
                        onClick={() => handleDone(assignment)}
                        disabled={isLoading}
                        className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                      >완료</button>
                      <button
                        onClick={() => changeStatus(assignment, 'inspect')}
                        disabled={isLoading}
                        className="flex-1 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                      >점검 필요</button>
                      <button
                        onClick={() => changeStatus(assignment, 'dirty')}
                        disabled={isLoading}
                        className="w-full py-2 border border-gray-200 text-gray-500 rounded-xl text-xs disabled:opacity-40"
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
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-8" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 mb-1">{memoRoom.rooms.number}호 완료 처리</h2>
            <p className="text-xs text-gray-400 mb-4">특이사항이 있으면 메모를 남겨주세요 (선택)</p>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="예: 욕실 수건 추가 요청, 미니바 비어있음..."
              rows={3}
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setMemoRoom(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600">취소</button>
              <button onClick={confirmDone} className="flex-1 py-3 bg-green-500 text-white rounded-xl text-sm font-semibold">완료 확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
