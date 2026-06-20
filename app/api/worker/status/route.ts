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

  const staffId = payload.app_metadata?.staff_id as string
  const hotelId = payload.app_metadata?.hotel_id as string
  const { roomId, assignmentId, status, memo } = await request.json()

  if (!roomId || !status) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()

  // 내 호텔 객실인지 확인
  const { data: room } = await service.from('rooms').select('id').eq('id', roomId).eq('hotel_id', hotelId).single()
  if (!room) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // 방 상태 업데이트
  await service.from('rooms').update({ status }).eq('id', roomId)

  // 로그 기록
  await service.from('room_logs').insert({
    room_id: roomId,
    status,
    changed_by: staffId,
    memo: memo ?? null,
  })

  // 완료 처리 시 assignment.completed_at 기록
  if (status === 'done' && assignmentId) {
    await service.from('assignments')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', assignmentId)
  }

  return NextResponse.json({ ok: true })
}
