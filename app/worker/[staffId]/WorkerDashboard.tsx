'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
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

type Toast = { msg: string; type: 'error' | 'success' | 'info'; retry?: () => void }

type Supply = { id: string; name: string; unit: string }

// 오프라인 상태 변경 큐 (T-085)
type QueuedChange = { roomId: string; assignmentId: string; status: string; memo: string | null; ts: number }

const QUEUE_KEY = 'worker-status-queue'
const QUEUE_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24시간 지난 항목 폐기

function readQueue(): QueuedChange[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const items: QueuedChange[] = raw ? JSON.parse(raw) : []
    return items.filter(i => Date.now() - i.ts < QUEUE_MAX_AGE_MS)
  } catch {
    return []
  }
}

function writeQueue(items: QueuedChange[]) {
  try {
    if (items.length === 0) localStorage.removeItem(QUEUE_KEY)
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  } catch {
    // localStorage 사용 불가 시 무시
  }
}

// T-100: 로케일 코드 → Intl 로케일 매핑
const DATE_LOCALES: Record<string, string> = { ko: 'ko-KR', en: 'en-US', vi: 'vi-VN' }

const ROOM_TYPES = ['single', 'double', 'suite', 'other'] as const

const ALERT_MINUTES = Number(process.env.NEXT_PUBLIC_CHECKIN_ALERT_MINUTES ?? 120)

function isUrgent(room: Room, now: Date) {
  if (!room.checkin_time) return false
  if (room.status === 'done' || room.status === 'inspect') return false
  const alertAt = new Date(new Date(room.checkin_time).getTime() - ALERT_MINUTES * 60 * 1000)
  return now >= alertAt
}

function fmtTime(iso: string | null, dateLocale: string) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
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
  const locale = useLocale()
  const t = useTranslations('worker')
  const router = useRouter()
  const dateLocale = DATE_LOCALES[locale] ?? 'ko-KR'
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [memoRoom, setMemoRoom] = useState<Assignment | null>(null)
  const [memo, setMemo] = useState('')
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [supplyQtys, setSupplyQtys] = useState<Record<string, number>>({})
  const [maintenanceRoom, setMaintenanceRoom] = useState<Assignment | null>(null)
  const [maintenanceDesc, setMaintenanceDesc] = useState('')
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [pushState, setPushState] = useState<PushState>('unsupported')
  const [showIosGuide, setShowIosGuide] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // iOS Safari 푸시 안내 (T-054): 홈 화면 추가 전에는 웹 푸시 불가
  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isIos && !isStandalone && !localStorage.getItem('ios-push-guide-shown')) {
      setShowIosGuide(true)
      localStorage.setItem('ios-push-guide-shown', '1')
    }
  }, [])

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

  function showToast(msg: string, type: Toast['type'] = 'error', retry?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type, retry })
    toastTimer.current = setTimeout(() => setToast(null), retry ? 6000 : 3000)
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

  // 오프라인 큐 순차 재전송 (T-085): 성공 항목은 큐에서 제거, 실패 시 중단해 다음 복귀 때 재시도
  const flushQueue = useCallback(async () => {
    let queue = readQueue()
    writeQueue(queue) // 24시간 지난 항목 폐기 결과 반영
    if (queue.length === 0) return
    let sent = 0
    for (const item of [...queue]) {
      try {
        const res = await fetch('/api/worker/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: item.roomId, assignmentId: item.assignmentId, status: item.status, memo: item.memo }),
        })
        if (!res.ok) break
        queue = queue.filter(q => q !== item)
        writeQueue(queue)
        sent++
      } catch {
        break
      }
    }
    if (sent > 0) {
      showToast(t('offlineQueue.sent', { count: sent }), 'success')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      flushQueue().finally(() => refetch())
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    // 접속 시점에 밀린 큐가 있으면 전송
    if (navigator.onLine) {
      if (readQueue().length > 0) flushQueue().finally(() => refetch())
    } else {
      setIsOnline(false)
    }
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refetch, flushQueue])

  useEffect(() => {
    const supabase = createClientWithToken(token)
    const channel = supabase.channel('worker-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, refetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch, token])

  async function submitMaintenance() {
    if (!maintenanceRoom || !maintenanceDesc.trim()) return
    setMaintenanceSaving(true)
    try {
      const res = await fetch('/api/worker/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: maintenanceRoom.rooms.id,
          description: maintenanceDesc.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      showToast(t('maintenance.success'), 'success')
      setMaintenanceRoom(null)
      setMaintenanceDesc('')
    } catch {
      showToast(t('maintenance.error'))
    } finally {
      setMaintenanceSaving(false)
    }
  }

  async function changeStatus(assignment: Assignment, status: string, memoText?: string) {
    const roomId = assignment.rooms.id

    // 오프라인이면 큐에 저장 후 온라인 복귀 시 자동 전송 (T-085)
    if (!navigator.onLine) {
      const queue = readQueue()
      queue.push({ roomId, assignmentId: assignment.id, status, memo: memoText ?? null, ts: Date.now() })
      writeQueue(queue)
      // 화면에는 변경 결과를 미리 반영
      setAssignments(prev => prev.map(a =>
        a.rooms.id === roomId ? { ...a, rooms: { ...a.rooms, status: status as Room['status'] } } : a
      ))
      showToast(t('offlineQueue.queued'), 'info')
      return
    }

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
      showToast(t('errors.saveFailed'), 'error', () => changeStatus(assignment, status, memoText))
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

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-4 pt-10 pb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <div>
              <p className="text-xs text-slate-400 mb-1">{now.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', weekday: 'short' })}</p>
              <p className="text-xl font-bold text-slate-900">{t('greeting', { name: staffName })}</p>
            </div>
            {pushState !== 'unsupported' && (
              <div className="relative mt-1">
                <button
                  onClick={pushState === 'idle' ? subscribePush : pushState === 'subscribed' ? unsubscribePush : undefined}
                  disabled={pushState === 'denied'}
                  title={pushState === 'denied' ? t('push.denied') : undefined}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                    pushState === 'idle' ? 'text-slate-400 hover:bg-slate-100' :
                    pushState === 'subscribed' ? 'text-slate-700 hover:bg-slate-100' :
                    'text-red-400 cursor-default'
                  }`}
                >
                  {pushState === 'subscribed' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z" />
                      <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" clipRule="evenodd" />
                    </svg>
                  ) : pushState === 'denied' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                  )}
                </button>
                {pushState === 'subscribed' && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto mt-1">
              {(['ko', 'en', 'vi'] as const).map(loc => (
                <button
                  key={loc}
                  onClick={async () => {
                    await fetch('/api/worker/locale', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ locale: loc }),
                    })
                    router.refresh()
                  }}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    locale === loc ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {loc === 'ko' ? '한' : loc === 'en' ? 'EN' : 'VI'}
                </button>
              ))}
            </div>
          </div>
          {totalCount > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{doneCount}<span className="text-base text-slate-400 font-normal">/{totalCount}</span></p>
              <p className="text-xs text-slate-400">{t('completed')}</p>
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
          {t('offline')}
        </div>
      )}

      {/* 배정 목록 */}
      <div className="px-4 pt-4 space-y-2.5">
        {sorted.length === 0 && (
          <div className="text-center py-24">
            <p className="text-3xl mb-3">🧺</p>
            <p className="text-slate-500 text-sm font-medium">{t('noAssignments')}</p>
            <p className="text-slate-400 text-xs mt-1">{t('noAssignmentsHint')}</p>
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
              className={`bg-white rounded-2xl border transition-all ${
                urgent
                  ? 'border-red-300 ring-1 ring-red-200'
                  : finished
                  ? 'border-slate-100 opacity-60'
                  : 'border-slate-200'
              }`}
            >
              {/* 카드 상단: 방 정보 */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-bold text-slate-900">{t('roomNumber', { number: room.number })}</span>
                    <div className="flex flex-col">
                      {urgent && (
                        <span className="text-xs font-semibold text-red-500 leading-tight">{t('status.urgent')}</span>
                      )}
                      {isDone && (
                        <span className="text-xs font-semibold text-emerald-600 leading-tight">{t('status.done')}</span>
                      )}
                      {isInspect && (
                        <span className="text-xs font-semibold text-violet-600 leading-tight">{t('status.inspect')}</span>
                      )}
                      {!finished && !urgent && (
                        <span className="text-xs text-slate-400 leading-tight">{room.status === 'cleaning' ? t('status.cleaning') : t('status.dirty')}</span>
                      )}
                    </div>
                  </div>
                  {room.checkin_time && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{t('checkin')}</p>
                      <p className={`text-sm font-bold leading-tight ${urgent ? 'text-red-500' : 'text-slate-700'}`}>
                        {fmtTime(room.checkin_time, dateLocale)}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{t('floor', { floor: room.floor })} · {(ROOM_TYPES as readonly string[]).includes(room.type) ? t(`types.${room.type as typeof ROOM_TYPES[number]}`) : room.type}</p>
              </div>

              {/* 액션 버튼 */}
              {!finished && (
                <div className="px-3 pb-3 space-y-2">
                  {room.status === 'dirty' && (
                    <button
                      onClick={() => changeStatus(assignment, 'cleaning')}
                      disabled={isLoading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
                    >
                      {isLoading ? t('actions.processing') : t('actions.startCleaning')}
                    </button>
                  )}
                  {room.status === 'cleaning' && (
                    <>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setMemoRoom(assignment)
                            setMemo('')
                            fetch('/api/worker/supplies')
                              .then(r => r.json())
                              .then((data: Supply[]) => setSupplies(data))
                              .catch(() => {})
                            setSupplyQtys({})
                          }}
                          disabled={isLoading}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
                        >{t('actions.done')}</button>
                        <button
                          onClick={() => changeStatus(assignment, 'inspect')}
                          disabled={isLoading}
                          className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
                        >{t('actions.inspectNeeded')}</button>
                      </div>
                      <button
                        onClick={() => changeStatus(assignment, 'dirty')}
                        disabled={isLoading}
                        className="w-full py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >{t('actions.revertDirty')}</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMaintenanceRoom(assignment); setMaintenanceDesc('') }}
                        className="w-full py-2 border border-slate-200 text-slate-400 rounded-xl text-xs hover:bg-slate-50 hover:text-slate-600 transition-colors"
                      >🔧 {t('actions.maintenanceReport')}</button>
                    </>
                  )}
                </div>
              )}
              {/* 완료된 카드에도 수리 신고 가능 */}
              {finished && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => { setMaintenanceRoom(assignment); setMaintenanceDesc('') }}
                    className="w-full py-2 border border-dashed border-slate-200 text-slate-400 rounded-xl text-xs hover:bg-slate-50 transition-colors"
                  >🔧 {t('actions.maintenanceReport')}</button>
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
            <h2 className="font-bold text-slate-900 text-base mb-0.5">{t('memo.title', { number: memoRoom.rooms.number })}</h2>
            <p className="text-xs text-slate-400 mb-4">{t('memo.subtitle')}</p>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder={t('memo.placeholder')}
              rows={3}
              autoFocus
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            {supplies.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 font-medium mb-2">{t('supplies.title')}</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {supplies.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-slate-700">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSupplyQtys(prev => ({ ...prev, [s.id]: Math.max(0, (prev[s.id] ?? 0) - 1) }))}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-sm font-bold"
                        >−</button>
                        <span className="w-8 text-center text-sm font-medium text-slate-900">{supplyQtys[s.id] ?? 0}</span>
                        <button
                          onClick={() => setSupplyQtys(prev => ({ ...prev, [s.id]: (prev[s.id] ?? 0) + 1 }))}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-sm font-bold"
                        >+</button>
                        <span className="text-xs text-slate-400 w-6">{s.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setMemoRoom(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">{t('memo.cancel')}</button>
              <button
                onClick={async () => {
                  if (!memoRoom) return
                  await changeStatus(memoRoom, 'done', memo)

                  const usedItems = Object.entries(supplyQtys)
                    .filter(([, qty]) => qty > 0)
                    .map(([supplyId, quantity]) => ({ supplyId, quantity }))

                  if (usedItems.length > 0) {
                    fetch('/api/worker/supply-request', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ roomId: memoRoom.rooms.id, items: usedItems }),
                    }).catch(() => {})
                  }

                  setMemoRoom(null)
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >{t('memo.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* 수리 신고 모달 */}
      {maintenanceRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-30" onClick={() => setMaintenanceRoom(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h2 className="font-bold text-slate-900 text-base mb-0.5">{t('maintenance.title', { number: maintenanceRoom.rooms.number })}</h2>
            <p className="text-xs text-slate-400 mb-4">{t('maintenance.subtitle')}</p>
            <textarea
              value={maintenanceDesc}
              onChange={e => setMaintenanceDesc(e.target.value)}
              placeholder={t('maintenance.placeholder')}
              rows={3}
              autoFocus
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setMaintenanceRoom(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">취소</button>
              <button
                onClick={submitMaintenance}
                disabled={maintenanceSaving || !maintenanceDesc.trim()}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >{maintenanceSaving ? '접수 중...' : '신고 접수'}</button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari 푸시 안내 모달 (T-054) */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-40" onClick={() => setShowIosGuide(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h2 className="font-bold text-slate-900 text-base mb-1">🔔 알림을 받으려면 홈 화면에 추가하세요</h2>
            <p className="text-xs text-slate-400 mb-5">iPhone·iPad의 Safari에서는 홈 화면에 추가해야 새 배정 알림을 받을 수 있습니다.</p>
            <ol className="space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                <span className="text-sm text-slate-700">
                  하단의 <span className="font-semibold">공유 버튼</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 inline mx-1 -mt-0.5 text-blue-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  을 탭하세요
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
                <span className="text-sm text-slate-700">➕ <span className="font-semibold">&lsquo;홈 화면에 추가&rsquo;</span>를 선택하세요</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">3</span>
                <span className="text-sm text-slate-700">🏠 홈 화면의 아이콘으로 접속하면 알림을 켤 수 있어요</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >닫기</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 flex items-center gap-3 ${
          toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-slate-700' : 'bg-emerald-500'
        }`}>
          <span>{toast.msg}</span>
          {toast.retry && (
            <button
              onClick={() => {
                const retry = toast.retry
                setToast(null)
                if (toastTimer.current) clearTimeout(toastTimer.current)
                retry?.()
              }}
              className="shrink-0 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
            >다시 시도</button>
          )}
        </div>
      )}
    </div>
  )
}
