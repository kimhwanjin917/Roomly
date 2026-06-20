import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('roomly_guest_session')
  if (!sessionCookie) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(sessionCookie.value, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const hotelId = payload.app_metadata?.hotel_id as string
  const { roomId, assignmentId, status, memo } = await request.json()
  if (!roomId || !status) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()

  const { data: room } = await service.from('rooms').select('id').eq('id', roomId).eq('hotel_id', hotelId).single()
  if (!room) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  await service.from('rooms').update({ status }).eq('id', roomId)
  await service.from('room_logs').insert({ room_id: roomId, status, changed_by: 'guest', memo: memo ?? null })

  if (status === 'done' && assignmentId) {
    await service.from('assignments').update({ completed_at: new Date().toISOString() }).eq('id', assignmentId)
  }

  return NextResponse.json({ ok: true })
}
