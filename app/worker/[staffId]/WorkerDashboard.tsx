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

type PushState = 'idle' | 'subscribed' | 'denied' | 'unsupported'

export default function WorkerDashboard({ staffId, hotelId, staffName, initialAssignments, token }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [memoRoom, setMemoRoom] = useState<Assignment | null>(null)
  const [memo, setMemo] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [pushState, setPushState] = useState<PushState>('unsupported')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setPushState('unsupported')
      return
    }
    if (Notification.permission === 'granted') {
      setPushState('subscribed')
    } else if (Notification.permission === 'denied') {
      setPushState('denied')
    } else {
      setPushState('idle')
    }
  }, [])

  async function subscribePush() {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setPushState('denied'); return }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), staffId, hotelId, isAdmin: false }),
    })
    setPushState('subscribed')
  }

  async function unsubscribePush() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
    setPushState('idle')
  }

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
      // 네트워크 오류 시 기존 데이터 유지
    }
  }, [staffId])

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

  const doneCount = assignments.filter(a => a.rooms.status === 'done' || a.rooms.status === 'inspect').length
  const totalCount = assignments.length
  const allDone = totalCount > 0 && doneCount === totalCount

  return (
    <div className="min-h-screen bg-toss-bg pb-10">

      {/* 헤더 */}
      <div className="bg-white px-5 pt-12 pb-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-[#B0B8C1] font-medium mb-1.5">
              {now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
            <h1 className="text-[22px] font-bold text-[#191919] leading-tight">
              안녕하세요,<br />{staffName}님 👋
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* 알림 버튼 */}
            {pushState !== 'unsupported' && (
              <button
                onClick={pushState === 'idle' ? subscribePush : pushState === 'subscribed' ? unsubscribePush : undefined}
                disabled={pushState === 'denied'}
                title={pushState === 'denied' ? '브라우저 알림이 차단됨' : undefined}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors relative ${
                  pushState === 'idle' ? 'bg-[#F2F4F6] text-[#B0B8C1]' :
                  pushState === 'subscribed' ? 'bg-[#EBF3FF] text-toss-blue' :
                  'bg-[#FFF0F0] text-toss-error cursor-default'
                }`}
              >
                {pushState === 'subscribed' ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                )}
              </button>
            )}

            {/* 완료 카운터 */}
            {totalCount > 0 && (
              <div className={`px-4 py-2 rounded-2xl text-center ${allDone ? 'bg-[#E6FBF1]' : 'bg-[#F2F4F6]'}`}>
                <p className={`text-lg font-bold leading-none ${allDone ? 'text-toss-success' : 'text-[#191919]'}`}>
                  {doneCount}<span className="text-sm font-normal text-[#B0B8C1]">/{totalCount}</span>
                </p>
                <p className="text-[10px] font-medium text-[#B0B8C1] mt-0.5">완료</p>
              </div>
            )}
          </div>
        </div>

        {/* 진행률 바 */}
        {totalCount > 0 && (
          <div className="h-1.5 bg-[#F2F4F6] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${allDone ? 'bg-toss-success' : 'bg-toss-blue'}`}
              style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="bg-toss-warn/10 px-5 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-toss-warn" />
          <p className="text-sm font-semibold text-[#B07800]">오프라인 상태입니다. 마지막 데이터를 표시 중입니다.</p>
        </div>
      )}

      {/* 모두 완료 상태 */}
      {allDone && (
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-card p-6 text-center">
          <div className="w-12 h-12 bg-[#E6FBF1] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" fill="#05C072" className="w-6 h-6">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-base font-bold text-[#191919]">모든 객실 완료!</p>
          <p className="text-sm text-[#B0B8C1] mt-1">오늘 수고하셨습니다 🎉</p>
        </div>
      )}

      {/* 배정 목록 */}
      <div className="px-4 pt-4 space-y-3">
        {sorted.length === 0 && !allDone && (
          <div className="text-center py-24">
            <p className="text-[#B0B8C1] text-sm font-medium">배정된 객실이 없습니다</p>
          </div>
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
              className={`bg-white rounded-2xl shadow-card overflow-hidden transition-all ${
                urgent ? 'ring-1.5 ring-toss-error' : ''
              } ${finished ? 'opacity-50' : ''}`}
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      urgent ? 'bg-[#FFF0F0] text-toss-error' :
                      isDone ? 'bg-[#E6FBF1] text-toss-success' :
                      isInspect ? 'bg-violet-50 text-violet-600' :
                      room.status === 'cleaning' ? 'bg-amber-50 text-amber-600' :
                      'bg-[#F2F4F6] text-[#6B7684]'
                    }`}>
                      {room.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#191919] leading-none">{room.number}호</span>
                        {urgent && (
                          <span className="px-2 py-0.5 bg-[#FFF0F0] text-toss-error text-[10px] font-bold rounded-full">긴급</span>
                        )}
                        {isDone && (
                          <span className="px-2 py-0.5 bg-[#E6FBF1] text-toss-success text-[10px] font-bold rounded-full">완료</span>
                        )}
                        {isInspect && (
                          <span className="px-2 py-0.5 bg-violet-50 text-violet-600 text-[10px] font-bold rounded-full">점검대기</span>
                        )}
                        {!finished && !urgent && room.status === 'cleaning' && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full">청소중</span>
                        )}
                      </div>
                      <p className="text-xs text-[#B0B8C1] mt-0.5">{room.floor}층 · {TYPE_LABELS[room.type] ?? room.type}</p>
                    </div>
                  </div>
                  {room.checkin_time && (
                    <div className="text-right">
                      <p className="text-[10px] text-[#B0B8C1] font-medium">체크인</p>
                      <p className={`text-base font-bold leading-tight mt-0.5 ${urgent ? 'text-toss-error' : 'text-[#191919]'}`}>
                        {fmtTime(room.checkin_time)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 액션 버튼 */}
              {!finished && (
                <div className="px-4 pb-4 space-y-2">
                  {room.status === 'dirty' && (
                    <button
                      onClick={() => changeStatus(assignment, 'cleaning')}
                      disabled={isLoading}
                      className="w-full py-3.5 bg-toss-blue hover:bg-toss-blue-hover active:bg-toss-blue-hover text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
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
                          className="flex-1 py-3.5 bg-toss-success hover:bg-[#04AD65] text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
                        >완료</button>
                        <button
                          onClick={() => changeStatus(assignment, 'inspect')}
                          disabled={isLoading}
                          className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
                        >점검 필요</button>
                      </div>
                      <button
                        onClick={() => changeStatus(assignment, 'dirty')}
                        disabled={isLoading}
                        className="w-full py-3 bg-[#F2F4F6] hover:bg-[#E8EAED] text-[#6B7684] rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors"
                      >대기중으로 되돌리기</button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 완료 메모 바텀시트 */}
      {memoRoom && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end justify-center z-20"
          onClick={() => setMemoRoom(null)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[#E8EAED] rounded-full" />
            </div>
            <div className="px-6 pt-4 pb-6">
              <h2 className="font-bold text-[#191919] text-lg mb-1">{memoRoom.rooms.number}호 완료 처리</h2>
              <p className="text-sm text-[#B0B8C1] mb-5">특이사항이 있으면 메모를 남겨주세요</p>
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="예: 욕실 수건 추가 요청, 미니바 비어있음..."
                rows={3}
                autoFocus
                className="w-full px-4 py-3.5 bg-[#F2F4F6] rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-toss-blue focus:bg-white mb-4 transition-all placeholder:text-[#B0B8C1]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setMemoRoom(null)}
                  className="flex-1 py-3.5 bg-[#F2F4F6] hover:bg-[#E8EAED] rounded-xl text-sm font-bold text-[#191919] transition-colors"
                >취소</button>
                <button
                  onClick={async () => {
                    if (!memoRoom) return
                    await changeStatus(memoRoom, 'done', memo)
                    setMemoRoom(null)
                  }}
                  className="flex-1 py-3.5 bg-toss-success hover:bg-[#04AD65] text-white rounded-xl text-sm font-bold transition-colors"
                >완료 확인</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3.5 rounded-2xl text-sm font-bold text-white shadow-modal z-50 whitespace-nowrap ${
          toast.type === 'error' ? 'bg-toss-error' : 'bg-toss-success'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
