import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { checkLimit } from '@/lib/rateLimit'
import { runAgentCycle } from '@/lib/agent'
import { aiEnabled } from '@/lib/ai'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'

/** 활동 패널에 보여줄 로그 개수 */
const LOG_LIMIT = 40

/** 수동 실행은 Claude 호출을 유발한다 — 관리자 공통 제한(60/분)보다 훨씬 좁게 건다 */
const RUN_LIMIT = { limit: 6, windowMs: 60_000 }

/** GET — 에이전트 활동 로그 (관리자 대시보드 패널) */
async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  const { data } = await service
    .from('agent_logs')
    .select('id, cycle_id, kind, message, detail, created_at')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .limit(LOG_LIMIT)

  return NextResponse.json({ logs: data ?? [], enabled: aiEnabled() })
}

/**
 * POST — 에이전트를 지금 1사이클 돌린다.
 *
 * 평소에는 /api/cron/agent가 5분마다 돌리고, 이 라우트는 관리자가
 * "지금 당장" 버튼을 눌렀을 때와 데모에서 쓴다.
 */
async function postHandler() {
  const { hotelId, service } = await requireAdmin()

  if (!aiEnabled()) {
    throw ApiError.unavailable('AI 기능이 설정되지 않았습니다. (ANTHROPIC_API_KEY)', 'ai_disabled')
  }

  const allowed = await checkLimit(RUN_LIMIT, `agent-run:${hotelId}`)
  if (!allowed) throw ApiError.tooManyRequests('에이전트 실행이 너무 잦습니다. 잠시 후 다시 시도해주세요.')

  const result = await runAgentCycle(service, hotelId)
  return NextResponse.json(result)
}

export const GET = withApiError(getHandler)
export const POST = withApiError(postHandler)
