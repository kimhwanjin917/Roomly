import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


async function getHandler(request: NextRequest) {
  const { hotelId, service } = await requireApiKey(request)

  // rooms!inner 조인이 있어야 rooms.hotel_id 필터가 실제로 적용된다.
  // 일반 임베드에서는 이 필터가 조인 결과만 비우고 행은 남겨서 타 호텔 배정이 노출된다.
  const { data } = await service
    .from('assignments')
    .select('id, room_id, staff_id, is_guest, assigned_at, rooms!inner(number, floor, hotel_id)')
    .eq('rooms.hotel_id', hotelId)
    .is('completed_at', null)
    .is('cancelled_at', null)

  return NextResponse.json({ assignments: data ?? [] })
}

export const GET = withApiError(getHandler)
