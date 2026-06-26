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
  const { roomId, status, memo } = await request.json()

  const VALID_STATUSES = ['dirty', 'cleaning', 'done', 'inspect']
  if (!roomId || !status) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 })

  const service = createServiceClient()

  // 내 호텔 객실이면서 나에게 배정된 방인지 확인 (hotel_id까지 join으로 검증)
  const { data: assignment } = await service
    .from('assignments')
    .select('id, rooms!inner(hotel_id)')
    .eq('room_id', roomId)
    .eq('staff_id', staffId)
    .eq('rooms.hotel_id', hotelId)
    .is('completed_at', null)
    .is('cancelled_at', null)
    .single()
  if (!assignment) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // 방 상태 업데이트
  await service.from('rooms').update({ status }).eq('id', roomId)

  // 로그 기록
  await service.from('room_logs').insert({
    room_id: roomId,
    status,
    changed_by: staffId,
    memo: memo ?? null,
  })

  // 완료 처리 시 assignment.completed_at 원자적 기록 (쿼리한 assignment.id 직접 사용)
  if (status === 'done') {
    await service.from('assignments')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', assignment.id)
  }

  return NextResponse.json({ ok: true })
}
