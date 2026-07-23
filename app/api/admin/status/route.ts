import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { requireRoom } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'
import { isRoomStatus } from '@/lib/constants'

async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()
  const { roomId, status, checkinTime, memo } = await request.json()

  if (!roomId) throw ApiError.badRequest('객실을 선택해주세요.')
  if (!isRoomStatus(status)) throw ApiError.badRequest('유효하지 않은 상태입니다.', 'invalid_status')

  await requireRoom(service, roomId, hotelId)

  const { error: roomErr } = await service
    .from('rooms')
    .update({
      status,
      checkin_time: checkinTime ? new Date(checkinTime).toISOString() : null,
    })
    .eq('id', roomId)
  if (roomErr) throw ApiError.internal()

  const { error: logErr } = await service.from('room_logs').insert({
    room_id: roomId,
    status,
    changed_by: 'admin',
    memo: memo || null,
  })
  if (logErr) throw ApiError.internal()

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
