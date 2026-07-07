import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToAdmin } from '@/lib/push'
import { withApiError } from '@/lib/api-error'

const DEFAULT_ALERT_MINUTES = 120

async function getHandler(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()

  // 호텔별 알림 기준 시간 (hotels.checkin_alert_minutes, 기본 120분)
  const { data: hotels } = await service
    .from('hotels')
    .select('id, checkin_alert_minutes')

  const alertMinutesByHotel = new Map<string, number>()
  for (const h of hotels ?? []) {
    alertMinutesByHotel.set(h.id, h.checkin_alert_minutes ?? DEFAULT_ALERT_MINUTES)
  }

  const maxMinutes = Math.max(
    DEFAULT_ALERT_MINUTES,
    ...Array.from(alertMinutesByHotel.values()),
  )
  const windowEnd = new Date(now.getTime() + maxMinutes * 60 * 1000)

  // 후보: checkin_time이 [now, now + max window] 안이고, 완료/점검이 아닌 방
  const { data: rooms } = await service
    .from('rooms')
    .select('id, hotel_id, number, checkin_time')
    .in('status', ['dirty', 'cleaning'])
    .gte('checkin_time', now.toISOString())
    .lte('checkin_time', windowEnd.toISOString())
    .is('deleted_at', null)

  // 호텔별 기준 시간 적용: checkin_time <= now + checkin_alert_minutes
  const candidates = (rooms ?? []).filter(room => {
    if (!room.checkin_time) return false
    const minutes = alertMinutesByHotel.get(room.hotel_id) ?? DEFAULT_ALERT_MINUTES
    const alertWindowEnd = now.getTime() + minutes * 60 * 1000
    return new Date(room.checkin_time).getTime() <= alertWindowEnd
  })

  if (!candidates.length) return NextResponse.json({ alerted: 0 })

  // room_logs alert_type='urgent_2h' 중복 방지
  const { data: existingAlerts } = await service
    .from('room_logs')
    .select('room_id')
    .in('room_id', candidates.map(r => r.id))
    .eq('alert_type', 'urgent_2h')

  const alertedRoomIds = new Set(existingAlerts?.map(a => a.room_id) ?? [])
  const toAlert = candidates.filter(r => !alertedRoomIds.has(r.id))

  let count = 0
  for (const room of toAlert) {
    // Log alert to prevent duplicate
    const { error: logError } = await service.from('room_logs').insert({
      room_id: room.id,
      status: 'dirty',
      changed_by: 'system',
      alert_type: 'urgent_2h',
    })
    if (logError) continue // 로그 실패 시 발송 생략 (다음 주기에 재시도)

    // Send push to admin
    const checkinTime = new Date(room.checkin_time!).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const minutes = alertMinutesByHotel.get(room.hotel_id) ?? DEFAULT_ALERT_MINUTES
    await sendPushToAdmin(room.hotel_id, {
      title: `⚠️ 체크인 ${minutes >= 60 ? `${Math.round(minutes / 60)}시간` : `${minutes}분`} 전`,
      body: `${room.number}호 미완료 — 체크인 ${checkinTime}`,
      url: '/admin',
      tag: `checkin-alert-${room.id}`,
    }).catch(() => {})
    count++
  }

  return NextResponse.json({ alerted: count })
}

export const GET = withApiError(getHandler)
