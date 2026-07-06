import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['dirty', 'cleaning', 'done', 'inspect'] as const
type RoomStatus = (typeof VALID_STATUSES)[number]

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const { roomId, status, checkinTime, memo } = await request.json()

  if (!roomId) return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })
  if (!VALID_STATUSES.includes(status as RoomStatus)) {
    return NextResponse.json({ error: 'invalid_status', code: 'invalid_status' }, { status: 400 })
  }

  const service = createServiceClient()

  // 해당 방이 내 호텔 소속인지 서버에서 검증
  const { data: room } = await service
    .from('rooms').select('id').eq('id', roomId).eq('hotel_id', hotelId).is('deleted_at', null).single()
  if (!room) return NextResponse.json({ error: 'forbidden', code: 'forbidden' }, { status: 403 })

  const { error: roomErr } = await service.from('rooms').update({
    status,
    checkin_time: checkinTime ? new Date(checkinTime).toISOString() : null,
  }).eq('id', roomId)
  if (roomErr) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })

  const { error: logErr } = await service.from('room_logs').insert({
    room_id: roomId,
    status,
    changed_by: 'admin',
    memo: memo || null,
  })
  if (logErr) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
