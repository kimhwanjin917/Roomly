import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('roomly_worker_session')
  if (!sessionCookie) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(sessionCookie.value, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (payload.app_metadata?.worker_role !== 'dirty') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const staffId = payload.app_metadata?.staff_id as string
  const hotelId = payload.app_metadata?.hotel_id as string
  const { roomId } = await request.json()
  if (!roomId) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()

  const { data: room } = await service
    .from('rooms').select('id, status').eq('id', roomId).eq('hotel_id', hotelId).single()
  if (!room) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // dirty 전환은 done/inspect 상태에서만 허용 (cleaning 중이거나 이미 dirty면 거부)
  if (room.status === 'cleaning' || room.status === 'dirty') {
    return NextResponse.json({ error: 'invalid_state_transition' }, { status: 409 })
  }

  await service.from('rooms').update({ status: 'dirty' }).eq('id', roomId)

  await service.from('room_logs').insert({
    room_id: roomId,
    status: 'dirty',
    changed_by: staffId,
    memo: null,
  })

  return NextResponse.json({ ok: true })
}
