import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'

// done/inspect → dirty 전환만 허용 (체크아웃 방 더티 처리 전용)
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

  // 내 호텔 객실인지 + done/inspect 상태인지 확인
  const { data: room } = await service
    .from('rooms')
    .select('id, status')
    .eq('id', roomId)
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)
    .single()
  if (!room) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (room.status !== 'done' && room.status !== 'inspect') {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  // 방 상태 업데이트
  await service.from('rooms').update({ status: 'dirty' }).eq('id', roomId)

  // 로그 기록
  await service.from('room_logs').insert({
    room_id: roomId,
    status: 'dirty',
    changed_by: staffId,
    memo: null,
  })

  return NextResponse.json({ ok: true })
}
