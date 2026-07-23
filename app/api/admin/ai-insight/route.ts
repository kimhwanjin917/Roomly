import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { askClaudeJson, aiEnabled } from '@/lib/ai'
import { daysAgo } from '@/lib/date'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  if (!aiEnabled()) {
    throw ApiError.unavailable('AI 기능이 설정되지 않았습니다. (ANTHROPIC_API_KEY)', 'ai_disabled')
  }

  const weekAgo = daysAgo(7).toISOString()

  const [{ count: recentLogs }, { data: rooms }] = await Promise.all([
    // room_logs에는 hotel_id가 없다 — rooms 조인으로 호텔을 좁힌다
    service
      .from('room_logs')
      .select('id, rooms!inner(hotel_id)', { count: 'exact', head: true })
      .eq('rooms.hotel_id', hotelId)
      .gte('changed_at', weekAgo),
    service
      .from('rooms')
      .select('status')
      .eq('hotel_id', hotelId)
      .is('deleted_at', null),
  ])

  const byStatus = (rooms ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  const parsed = await askClaudeJson<{ insights?: string[] }>(
    `호텔 하우스키핑 데이터를 분석해서 한국어로 3가지 인사이트를 bullet point로 제공해주세요. 각 항목은 1-2문장으로 짧게.

데이터:
- 총 객실: ${rooms?.length ?? 0}개
- 현재 상태: ${JSON.stringify(byStatus)}
- 최근 7일 이벤트: ${recentLogs ?? 0}건

JSON 형식으로만 응답: {"insights": ["인사이트1", "인사이트2", "인사이트3"]}`,
  )

  return NextResponse.json({ insights: parsed?.insights ?? [] })
}

export const GET = withApiError(getHandler)
