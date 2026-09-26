import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { runAgentCycle } from '@/lib/agent'
import { hasPendingWork } from '@/lib/agent-tools'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'

/**
 * 하우스키핑 에이전트 크론 — 호텔마다 1사이클씩 돌린다.
 *
 * 한 호텔에서 실패해도 다음 호텔로 넘어간다 (runAgentCycle이 예외를 삼킨다).
 * ponytail: 호텔을 순차 처리한다. 호텔 수가 늘면 배치로 나눠야 한다.
 */
async function getHandler(request: NextRequest) {
  const { service } = await requireCron(request)

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ skipped: 'ANTHROPIC_API_KEY 미설정' })
  }

  const { data: hotels } = await service.from('hotels').select('id')
  if (!hotels?.length) return NextResponse.json({ hotels: 0 })

  const now = new Date()
  const results = []
  let skipped = 0

  for (const hotel of hotels) {
    // 배정할 객실이 없으면 모델을 부르지 않는다 — 한가한 시간대 호출비를 아낀다
    if (!(await hasPendingWork(service, hotel.id))) {
      skipped++
      continue
    }
    const result = await runAgentCycle(service, hotel.id, now)
    results.push({ hotelId: hotel.id, assigned: result.assigned, rejected: result.rejected })
  }

  return NextResponse.json({
    hotels: hotels.length,
    skipped,
    assigned: results.reduce((sum, r) => sum + r.assigned, 0),
    rejected: results.reduce((sum, r) => sum + r.rejected, 0),
  })
}

export const GET = withApiError(getHandler)
