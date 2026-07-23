import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


const LIMIT = 20

/** 결제 내역 조회 (T-027) — 관리자 세션의 hotel_id 기준 최근 20건 */
async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  const { data, error } = await service
    .from('payment_logs')
    .select('id, toss_order_id, amount, plan, status, failure_reason, created_at')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (error) {
    console.error('[billing/invoices]', error)
    throw ApiError.internal()
  }

  return NextResponse.json({ invoices: data ?? [] })
}

export const GET = withApiError(getHandler)
