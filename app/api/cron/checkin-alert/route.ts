import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { sendPushToAdmin } from '@/lib/push'
import { DEFAULT_CHECKIN_ALERT_MINUTES } from '@/lib/constants'
import { hoursAgo } from '@/lib/date'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/**
 * 체크인 임박/초과 알림 크론.
 *
 * 두 종류의 알림을 각각 1회씩만 보낸다. 중복 방지는 room_logs.alert_type을
 * 발송 "전에" INSERT 해서 확보한다 (INSERT 실패 시 발송을 건너뛰고 다음 주기에 재시도).
 * - urgent_2h: 호텔별 기준 시간(checkin_alert_minutes) 내로 체크인이 임박한 미완료 방
 * - overdue  : 체크인 시각이 이미 지난 미완료 방 (최근 24시간 내 건만)
 */

const UNFINISHED_STATUSES = ['dirty', 'cleaning']
/** 오래된 미입력 데이터로 인한 알림 폭주를 막는 상한 */
const OVERDUE_LOOKBACK_HOURS = 24

type AlertType = 'urgent_2h' | 'overdue'

interface RoomRow {
  id: string
  hotel_id: string
  number: string
  checkin_time: string | null
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function describeMinutes(minutes: number): string {
  return minutes >= 60 ? `${Math.round(minutes / 60)}시간` : `${minutes}분`
}

/** 이미 같은 종류의 알림을 받은 방을 제외한다. */
async function filterUnalerted(
  service: SupabaseClient,
  rooms: RoomRow[],
  alertType: AlertType,
): Promise<RoomRow[]> {
  if (!rooms.length) return []

  const { data } = await service
    .from('room_logs')
    .select('room_id')
    .in('room_id', rooms.map(r => r.id))
    .eq('alert_type', alertType)

  const alerted = new Set((data ?? []).map(a => a.room_id))
  return rooms.filter(r => !alerted.has(r.id))
}

/** 중복 방지 로그를 먼저 남기고 푸시를 보낸다. 실제 발송한 건수를 돌려준다. */
async function dispatch(
  service: SupabaseClient,
  rooms: RoomRow[],
  alertType: AlertType,
  message: (room: RoomRow) => { title: string; body: string },
): Promise<number> {
  let count = 0

  for (const room of rooms) {
    const { error } = await service.from('room_logs').insert({
      room_id: room.id,
      status: 'dirty',
      changed_by: 'system',
      alert_type: alertType,
    })
    if (error) continue // 로그 실패 시 발송 생략 — 다음 주기에 재시도

    await sendPushToAdmin(room.hotel_id, {
      ...message(room),
      url: '/admin',
      tag: `${alertType}-${room.id}`,
    }).catch(() => {})
    count++
  }

  return count
}

async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)
  const now = new Date()

  // 호텔별 알림 기준 시간
  const { data: hotels } = await service.from('hotels').select('id, checkin_alert_minutes')
  const alertMinutes = new Map<string, number>(
    (hotels ?? []).map(h => [h.id, h.checkin_alert_minutes ?? DEFAULT_CHECKIN_ALERT_MINUTES]),
  )
  const minutesFor = (hotelId: string) =>
    alertMinutes.get(hotelId) ?? DEFAULT_CHECKIN_ALERT_MINUTES

  // 가장 넓은 기준으로 후보를 한 번에 가져온 뒤 호텔별 기준으로 좁힌다
  const maxMinutes = Math.max(
    DEFAULT_CHECKIN_ALERT_MINUTES,
    ...Array.from(alertMinutes.values()),
  )
  const windowEnd = new Date(now.getTime() + maxMinutes * 60_000)

  const [{ data: upcoming }, { data: overdue }] = await Promise.all([
    service
      .from('rooms')
      .select('id, hotel_id, number, checkin_time')
      .in('status', UNFINISHED_STATUSES)
      .gte('checkin_time', now.toISOString())
      .lte('checkin_time', windowEnd.toISOString())
      .is('deleted_at', null),
    service
      .from('rooms')
      .select('id, hotel_id, number, checkin_time')
      .in('status', UNFINISHED_STATUSES)
      .lt('checkin_time', now.toISOString())
      .gte('checkin_time', hoursAgo(OVERDUE_LOOKBACK_HOURS, now).toISOString())
      .is('deleted_at', null),
  ])

  const overdueRooms = await filterUnalerted(service, (overdue ?? []) as RoomRow[], 'overdue')
  const overdueCount = await dispatch(service, overdueRooms, 'overdue', room => ({
    title: '🚨 체크인 시간 초과',
    body: `${room.number}호 미완료 — 체크인 ${formatTime(room.checkin_time!)} 경과`,
  }))

  // 호텔별 기준 적용: checkin_time <= now + checkin_alert_minutes
  const candidates = ((upcoming ?? []) as RoomRow[]).filter(room => {
    if (!room.checkin_time) return false
    return new Date(room.checkin_time).getTime() <= now.getTime() + minutesFor(room.hotel_id) * 60_000
  })

  const toAlert = await filterUnalerted(service, candidates, 'urgent_2h')
  const alerted = await dispatch(service, toAlert, 'urgent_2h', room => ({
    title: `⚠️ 체크인 ${describeMinutes(minutesFor(room.hotel_id))} 전`,
    body: `${room.number}호 미완료 — 체크인 ${formatTime(room.checkin_time!)}`,
  }))

  return NextResponse.json({ alerted, overdue: overdueCount })
}

export const GET = withApiError(getHandler)
