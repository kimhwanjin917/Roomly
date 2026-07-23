import { NextRequest, NextResponse } from 'next/server'
import { requireGuest } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


async function getHandler(request: NextRequest) {
  const { hotelId, service } = await requireGuest(request)

  // rooms 조인으로 호텔을 좁힌다 (기존의 roomIds 사전 조회 + IN 절 대체)
  const { data } = await service
    .from('assignments')
    .select('id, assigned_at, rooms!inner(id, number, floor, type, status, checkin_time, hotel_id, deleted_at)')
    .eq('rooms.hotel_id', hotelId)
    .is('rooms.deleted_at', null)
    .eq('is_guest', true)
    .is('completed_at', null)
    .is('cancelled_at', null)

  return NextResponse.json(data ?? [])
}

export const GET = withApiError(getHandler)
