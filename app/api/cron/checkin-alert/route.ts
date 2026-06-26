import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToAdmin } from '@/lib/push'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  // Find rooms: checkin_time between now and +2h, status not done/inspect, not deleted
  const { data: rooms } = await service
    .from('rooms')
    .select('id, hotel_id, number, checkin_time')
    .in('status', ['dirty', 'cleaning'])
    .gte('checkin_time', now.toISOString())
    .lte('checkin_time', twoHoursLater.toISOString())
    .is('deleted_at', null)

  if (!rooms?.length) return NextResponse.json({ alerted: 0 })

  // Check which rooms already have urgent_2h alert in room_logs
  const { data: existingAlerts } = await service
    .from('room_logs')
    .select('room_id')
    .in('room_id', rooms.map((r) => r.id))
    .eq('alert_type', 'urgent_2h')

  const alertedRoomIds = new Set(existingAlerts?.map((a) => a.room_id) ?? [])
  const toAlert = rooms.filter((r) => !alertedRoomIds.has(r.id))

  let count = 0
  for (const room of toAlert) {
    // Log alert to prevent duplicate
    await service.from('room_logs').insert({
      room_id: room.id,
      status: 'dirty',
      changed_by: 'system',
      alert_type: 'urgent_2h',
    })

    // Send push to admin
    const checkinTime = new Date(room.checkin_time!).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    await sendPushToAdmin(room.hotel_id, {
      title: '⚠️ 체크인 2시간 전',
      body: `${room.number}호 미완료 — 체크인 ${checkinTime}`,
    }).catch(() => {})
    count++
  }

  return NextResponse.json({ alerted: count })
}
