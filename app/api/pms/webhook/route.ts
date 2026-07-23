import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// PMS 어댑터별로 X-PMS-Source 헤더로 구분 (mews | cloudbeds | generic)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-roomly-webhook-secret')
  if (!process.env.PMS_WEBHOOK_SECRET || secret !== process.env.PMS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 })
  }

  const body = await req.json()
  const { hotelId, externalRoomId, action, checkinTime } = body

  if (!hotelId || !externalRoomId || !action) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const service = createServiceClient()

  // external_room_id로 room 조회 (number 필드가 external ID로 매핑된다고 가정)
  const { data: room } = await service
    .from('rooms')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('number', externalRoomId)
    .is('deleted_at', null)
    .single()

  if (!room) return NextResponse.json({ error: 'room not found', externalRoomId }, { status: 404 })

  if (action === 'checkout') {
    await service.from('rooms').update({ status: 'dirty', checkin_time: null }).eq('id', room.id)
  } else if (action === 'checkin' && checkinTime) {
    await service.from('rooms').update({ checkin_time: checkinTime }).eq('id', room.id)
  } else if (action === 'cancel') {
    await service.from('rooms').update({ checkin_time: null }).eq('id', room.id)
  }

  return NextResponse.json({ ok: true })
}
