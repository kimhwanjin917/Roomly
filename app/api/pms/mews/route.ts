import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { convertMewsEvent, type MewsReservationEvent } from '@/lib/pms/mews'

export async function POST(request: NextRequest) {
  const hotelId = request.headers.get('x-hotel-id')
  const webhookSecret = request.headers.get('x-roomly-webhook-secret')

  if (!hotelId || !webhookSecret) {
    return NextResponse.json({ error: 'missing_headers' }, { status: 400 })
  }

  const service = createServiceClient()

  // 시크릿 검증
  const { data: hotel } = await service
    .from('hotels')
    .select('webhook_secret')
    .eq('id', hotelId)
    .single()

  if (!hotel || hotel.webhook_secret !== webhookSecret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json() as MewsReservationEvent

  if (body.Type !== 'ReservationUpdated') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const payload = convertMewsEvent(body)
  if (!payload) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // 내부 처리 (기존 webhook 로직 재활용)
  if (payload.event === 'checkout') {
    await service
      .from('rooms')
      .update({ status: 'dirty', checkin_time: null })
      .eq('hotel_id', hotelId)
      .eq('number', payload.room_number)
  } else if (payload.event === 'checkin_updated' && payload.checkin_time) {
    await service
      .from('rooms')
      .update({ checkin_time: payload.checkin_time })
      .eq('hotel_id', hotelId)
      .eq('number', payload.room_number)
  }

  return NextResponse.json({ ok: true })
}
