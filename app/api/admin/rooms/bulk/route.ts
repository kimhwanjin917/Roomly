import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { assertRoomQuota } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'

/** 한 번의 요청으로 등록할 수 있는 최대 객실 수 */
const MAX_BULK_SIZE = 100

async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { startNumber, endNumber, floor, type } = await request.json()
  const start = parseInt(String(startNumber), 10)
  const end = parseInt(String(endNumber), 10)

  if (Number.isNaN(start) || Number.isNaN(end) || !floor) {
    throw ApiError.badRequest('시작 호수, 끝 호수, 층을 모두 입력해 주세요.')
  }
  if (start > end) {
    throw ApiError.badRequest('시작 호수가 끝 호수보다 클 수 없습니다.')
  }

  const requested = end - start + 1
  if (requested > MAX_BULK_SIZE) {
    throw ApiError.badRequest(`한 번에 최대 ${MAX_BULK_SIZE}개까지 등록할 수 있습니다.`)
  }

  await assertRoomQuota(service, hotelId, requested)

  const rooms = Array.from({ length: requested }, (_, i) => ({
    hotel_id: hotelId,
    number: String(start + i),
    floor: Number(floor),
    type: type ?? 'double',
  }))

  const { data, error } = await service
    .from('rooms')
    .insert(rooms)
    .select('id, number, floor, type')

  if (error) {
    if (error.code === '23505') {
      throw ApiError.conflict('이미 존재하는 호수가 포함되어 있습니다.', 'duplicate')
    }
    console.error('[admin/rooms/bulk POST]', error)
    throw ApiError.internal()
  }

  return NextResponse.json({ created: data?.length ?? 0, rooms: data })
}

export const POST = withApiError(postHandler)
