import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const hotelId = request.headers.get('x-hotel-id')
  const webhookSecret = request.headers.get('x-roomly-webhook-secret')

  if (!hotelId || !webhookSecret) {
    return NextResponse.json({ error: 'missing_headers', code: 'missing_headers' }, { status: 400 })
  }

  const service = createServiceClient()

  // 시크릿 검증
  const { data: hotel } = await service
    .from('hotels')
    .select('webhook_secret')
    .eq('id', hotelId)
    .single()

  if (!hotel || hotel.webhook_secret !== webhookSecret) {
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { event: string; room_number: string; checkin_time?: string }
  const { event, room_number, checkin_time } = body

  if (event === 'checkout') {
    // 체크아웃 → dirty 전환
    await service
      .from('rooms')
      .update({ status: 'dirty', checkin_time: null })
      .eq('hotel_id', hotelId)
      .eq('number', room_number)
  } else if (event === 'checkin_updated' && checkin_time) {
    // 체크인 시간 업데이트
    await service
      .from('rooms')
      .update({ checkin_time })
      .eq('hotel_id', hotelId)
      .eq('number', room_number)
  } else {
    return NextResponse.json({ error: 'unknown_event', code: 'unknown_event' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
