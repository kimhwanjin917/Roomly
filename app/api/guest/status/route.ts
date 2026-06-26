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
  const { roomId, status, memo } = await request.json()

  const VALID_STATUSES = ['dirty', 'cleaning', 'done', 'inspect']
  if (!roomId || !status) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 })

  const service = createServiceClient()

  // 게스트 풀에 배정된 방이면서 내 호텔 소속인지 확인 (hotel_id까지 join으로 검증)
  const { data: assignment } = await service
    .from('assignments')
    .select('id, rooms!inner(hotel_id)')
    .eq('room_id', roomId)
    .eq('is_guest', true)
    .eq('rooms.hotel_id', hotelId)
    .is('completed_at', null)
    .is('cancelled_at', null)
    .single()
  if (!assignment) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  await service.from('rooms').update({ status }).eq('id', roomId)
  await service.from('room_logs').insert({ room_id: roomId, status, changed_by: 'guest', memo: memo ?? null })

  // 완료 처리 시 assignment.completed_at 원자적 기록 (쿼리한 assignment.id 직접 사용)
  if (status === 'done') {
    await service.from('assignments').update({ completed_at: new Date().toISOString() }).eq('id', assignment.id)
  }

  return NextResponse.json({ ok: true })
}
