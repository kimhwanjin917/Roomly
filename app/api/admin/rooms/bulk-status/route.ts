import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

const VALID_STATUSES = ['dirty', 'cleaning', 'done', 'inspect']

/**
 * 객실 상태 일괄 변경 (T-198)
 * body: { roomIds: string[], status: 'dirty' | 'cleaning' | 'done' | 'inspect' }
 */
async function patchHandler(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const { roomIds, status } = await request.json() as { roomIds?: string[]; status?: string }

  if (!Array.isArray(roomIds) || roomIds.length === 0 || !status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })
  }
  if (roomIds.length > 500) {
    return NextResponse.json({ error: 'too_many_rooms', code: 'invalid_request' }, { status: 400 })
  }

  const service = createServiceClient()

  // 내 호텔 객실만 대상 (타 호텔 ID가 섞여 있어도 무시됨)
  const { data: updated, error } = await service
    .from('rooms')
    .update({ status })
    .in('id', roomIds)
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)
    .select('id')

  if (error) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })

  // 변경 이력 기록
  if (updated?.length) {
    await service.from('room_logs').insert(
      updated.map(r => ({
        room_id: r.id,
        status,
        changed_by: 'admin-bulk',
      }))
    )
  }

  return NextResponse.json({ updated: updated?.length ?? 0 })
}

export const PATCH = withApiError(patchHandler)
