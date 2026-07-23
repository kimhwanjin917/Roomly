import { NextRequest, NextResponse } from 'next/server'
import { requireWorker } from '@/lib/auth'
import { requireRoom } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'

/** 직원 고장·유지보수 신고 (T-131) */
async function postHandler(request: NextRequest) {
  const { staffId, hotelId, service } = await requireWorker(request)

  const { roomId, description } = await request.json()
  if (!description?.trim()) throw ApiError.badRequest('내용을 입력해주세요.')

  // 객실을 지정했다면 내 호텔 객실인지 확인
  if (roomId) await requireRoom(service, roomId, hotelId)

  const { error } = await service.from('maintenance_requests').insert({
    hotel_id: hotelId,
    staff_id: staffId,
    room_id: roomId ?? null,
    description: description.trim(),
  })

  if (error) {
    console.error('[worker/maintenance POST]', error)
    throw ApiError.internal()
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export const POST = withApiError(postHandler)
