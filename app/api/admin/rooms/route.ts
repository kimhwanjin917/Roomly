import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { assertRoomQuota } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'

async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { number, floor, type } = await request.json()
  if (!number?.trim() || !floor) throw ApiError.badRequest('호수와 층을 입력해주세요.')

  // 일괄 등록과 동일하게 플랜 한도를 적용한다
  await assertRoomQuota(service, hotelId, 1)

  const { data, error } = await service
    .from('rooms')
    .insert({ hotel_id: hotelId, number: number.trim(), floor: Number(floor), type })
    .select('id, number, floor, type')
    .single()

  if (error) {
    if (error.code === '23505') throw ApiError.conflict('이미 존재하는 호수입니다.', 'duplicate')
    console.error('[admin/rooms POST]', error)
    throw ApiError.internal()
  }

  return NextResponse.json(data)
}

export const POST = withApiError(postHandler)
