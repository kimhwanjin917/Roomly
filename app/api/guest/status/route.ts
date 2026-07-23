import { NextRequest, NextResponse } from 'next/server'
import { requireGuest } from '@/lib/auth'
import { requireRoom } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'
import { isRoomStatus } from '@/lib/constants'

async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireGuest(request)

  const { roomId, assignmentId, status, memo } = await request.json()
  if (!roomId) throw ApiError.badRequest('객실을 선택해주세요.')
  if (!isRoomStatus(status)) throw ApiError.badRequest('유효하지 않은 상태입니다.', 'invalid_status')

  await requireRoom(service, roomId, hotelId)

  await service.from('rooms').update({ status }).eq('id', roomId)
  await service.from('room_logs').insert({
    room_id: roomId,
    status,
    changed_by: 'guest',
    memo: memo ?? null,
  })

  // 게스트 배정 건만 완료 처리할 수 있다
  if (status === 'done' && assignmentId) {
    await service
      .from('assignments')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('room_id', roomId)
      .eq('is_guest', true)
  }

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
