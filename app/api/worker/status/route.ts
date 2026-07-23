import { NextRequest, NextResponse } from 'next/server'
import { requireWorker } from '@/lib/auth'
import { requireRoom } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'
import { isRoomStatus, isFinishedStatus } from '@/lib/constants'

async function postHandler(request: NextRequest) {
  const { staffId, hotelId, service } = await requireWorker(request)

  const { roomId, assignmentId, status, memo } = await request.json()
  if (!roomId) throw ApiError.badRequest('객실을 선택해주세요.')
  if (!isRoomStatus(status)) throw ApiError.badRequest('유효하지 않은 상태입니다.', 'invalid_status')

  await requireRoom(service, roomId, hotelId)

  await service.from('rooms').update({ status }).eq('id', roomId)

  await service.from('room_logs').insert({
    room_id: roomId,
    status,
    changed_by: staffId,
    memo: memo ?? null,
  })

  // 완료 처리 — 본인에게 배정된 건만 완료 처리할 수 있다.
  // 점검대기(inspect)도 근무자 몫은 끝난 것이므로 배정을 닫는다.
  if (assignmentId && isFinishedStatus(status)) {
    await service
      .from('assignments')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('staff_id', staffId)
      .is('completed_at', null)
  }

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
