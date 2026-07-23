import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { isRoomStatus } from '@/lib/constants'

async function patchHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const { hotelId, service } = await requireApiKey(request)

  const body = await request.json() as { status?: string; checkin_time?: string | null }

  // 허용된 필드만 업데이트
  const update: Record<string, unknown> = {}
  if (body.status !== undefined) {
    if (!isRoomStatus(body.status)) {
      throw ApiError.badRequest('유효하지 않은 상태입니다.', 'invalid_status')
    }
    update.status = body.status
  }
  if ('checkin_time' in body) update.checkin_time = body.checkin_time

  if (Object.keys(update).length === 0) {
    throw ApiError.badRequest('변경할 필드가 없습니다.', 'no_fields')
  }

  const { data, error } = await service
    .from('rooms')
    .update(update)
    .eq('id', params.id)
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)
    .select('id, number, floor, type, status, checkinTime:checkin_time')
    .single()

  if (error || !data) throw ApiError.notFound('객실을 찾을 수 없습니다.')

  return NextResponse.json(data)
}

export const PATCH = withApiError(patchHandler)
