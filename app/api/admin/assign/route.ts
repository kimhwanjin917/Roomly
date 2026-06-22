import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const { roomId, staffId, isGuest, unassign } = await request.json()

  if (!roomId) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()

  // 해당 방이 내 호텔 소속인지 확인
  const { data: room } = await service
    .from('rooms').select('id, number').eq('id', roomId).eq('hotel_id', hotelId).single()
  if (!room) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // 기존 활성 배정 취소
  await service.from('assignments')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .is('completed_at', null)
    .is('cancelled_at', null)

  // 미배정(unassign)이면 취소만 하고 종료
  if (unassign || (!staffId && !isGuest)) {
    return NextResponse.json({ ok: true })
  }

  // 새 배정 생성
  const { data: assignment, error } = await service.from('assignments').insert({
    room_id: roomId,
    staff_id: staffId ?? null,
    is_guest: isGuest ?? false,
  }).select('id').single()

  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 })

  return NextResponse.json({ assignmentId: assignment.id })
}
