import { NextRequest, NextResponse } from 'next/server'
import { requireGuest } from '@/lib/auth'
import { requireRoom } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'
import { isRoomStatus, isFinishedStatus } from '@/lib/constants'

async function postHandler(request: NextRequest) {
  const { hotelId, staffId, service } = await requireGuest(request)

  const { roomId, assignmentId, status, memo } = await request.json()
  if (!roomId) throw ApiError.badRequest('객실을 선택해주세요.')
  if (!isRoomStatus(status)) throw ApiError.badRequest('유효하지 않은 상태입니다.', 'invalid_status')

  await requireRoom(service, roomId, hotelId)

  await service.from('rooms').update({ status }).eq('id', roomId)

  // 일용직도 누가 처리했는지 남긴다 (staff가 지워져도 로그는 FK 없이 보존된다)
  await service.from('room_logs').insert({
    room_id: roomId,
    status,
    changed_by: staffId,
    memo: memo ?? null,
  })

  // 게스트 배정 건만 완료 처리할 수 있다.
  // 점검대기(inspect)도 근무자 몫은 끝난 것이므로 배정을 닫는다.
  if (assignmentId && isFinishedStatus(status)) {
    await service
      .from('assignments')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('room_id', roomId)
      .eq('is_guest', true)
      .is('completed_at', null)
  }

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
