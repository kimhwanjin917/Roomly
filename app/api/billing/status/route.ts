import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { toBillingInterval } from '@/lib/toss'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/** 현재 구독 상태 조회 (billing 페이지용) */
async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  const { data: hotel, error } = await service
    .from('hotels')
    .select('subscription_plan, pending_plan, plan_expires_at, toss_billing_key, billing_interval')
    .eq('id', hotelId)
    .single()

  if (error || !hotel) throw ApiError.internal()

  return NextResponse.json({
    plan: hotel.subscription_plan,
    pendingPlan: hotel.pending_plan,
    planExpiresAt: hotel.plan_expires_at,
    hasBillingKey: !!hotel.toss_billing_key,
    billingInterval: toBillingInterval(hotel.billing_interval),
  })
}

export const GET = withApiError(getHandler)
