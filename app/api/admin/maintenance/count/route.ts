import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/** 네비게이션 뱃지용 미해결 유지보수 요청 수 */
async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  const { count } = await service
    .from('maintenance_requests')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .eq('status', 'open')

  return NextResponse.json({ count: count ?? 0 })
}

export const GET = withApiError(getHandler)
