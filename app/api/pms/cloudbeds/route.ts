import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { convertCloudbedsEvent, type CloudbedsWebhookEvent } from '@/lib/pms/cloudbeds'
import { withApiError } from '@/lib/api-error'

/**
 * Cloudbeds PMS 어댑터 (T-202)
 * Mews 어댑터와 동일하게 X-Hotel-Id + X-Roomly-Webhook-Secret 헤더로 인증한다.
 */
async function postHandler(request: NextRequest) {
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

  const body = await request.json() as CloudbedsWebhookEvent

  const payload = convertCloudbedsEvent(body)
  if (!payload) {
    return NextResponse.json({ ok: true, skipped: true })
  }

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

export const POST = withApiError(postHandler)
