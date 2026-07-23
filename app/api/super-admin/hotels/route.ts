import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


async function getHandler() {
  const { service } = requireSuperAdmin()

  const [{ data: hotels }, { data: rooms }] = await Promise.all([
    service
      .from('hotels')
      .select('id, name, subscription_plan, created_at')
      .order('created_at', { ascending: false }),
    service.from('rooms').select('hotel_id').is('deleted_at', null),
  ])

  const roomCounts = (rooms ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.hotel_id] = (acc[r.hotel_id] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    hotels: (hotels ?? []).map(h => ({ ...h, roomCount: roomCounts[h.id] ?? 0 })),
  })
}

export const GET = withApiError(getHandler)
