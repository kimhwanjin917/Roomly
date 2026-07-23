import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { isRoomStatus } from '@/lib/constants'

/** 한 번에 상태를 바꿀 수 있는 최대 객실 수 */
const MAX_BATCH = 500

/**
 * 객실 상태 일괄 변경 (T-198)
 * body: { roomIds: string[], status: RoomStatus }
 */
async function patchHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { roomIds, status } = await request.json() as { roomIds?: string[]; status?: string }

  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    throw ApiError.badRequest('변경할 객실을 선택해주세요.')
  }
  if (!isRoomStatus(status)) {
    throw ApiError.badRequest('유효하지 않은 상태입니다.', 'invalid_status')
  }
  if (roomIds.length > MAX_BATCH) {
    throw ApiError.badRequest(`한 번에 최대 ${MAX_BATCH}개까지 변경할 수 있습니다.`, 'too_many_rooms')
  }

  // hotel_id 조건이 타 호텔 ID를 자동으로 걸러낸다
  const { data: updated, error } = await service
    .from('rooms')
    .update({ status })
    .in('id', roomIds)
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)
    .select('id')

  if (error) {
    console.error('[admin/rooms/bulk-status PATCH]', error)
    throw ApiError.internal()
  }

  if (updated?.length) {
    await service.from('room_logs').insert(
      updated.map(r => ({ room_id: r.id, status, changed_by: 'admin-bulk' })),
    )
  }

  return NextResponse.json({ updated: updated?.length ?? 0 })
}

export const PATCH = withApiError(patchHandler)
