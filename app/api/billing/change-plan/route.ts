import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import {
  chargeBillingKey,
  buildOrderId,
  buildOrderName,
  getPlanAmount,
  activateSubscription,
  toBillingInterval,
  PLAN_PRICES,
  type BillingInterval,
} from '@/lib/toss'

/**
 * 플랜 변경 (T-025) + 결제 주기 전환 (T-201)
 * - 업그레이드: 빌링키 있으면 즉시 청구 후 플랜 적용, 없으면 결제 UI 유도
 * - 다운그레이드: pending_plan에 저장 (만료일부터 적용)
 * - 주기 전환(월간↔연간): billing_interval 저장 → 다음 결제부터 적용
 */

const PLAN_ORDER: Record<string, number> = { trial: 0, starter: 1, standard: 2, pro: 3 }

async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { targetPlan, targetInterval } = await request.json() as {
    targetPlan?: string
    targetInterval?: string
  }
  if (!targetPlan || !PLAN_PRICES[targetPlan]) {
    throw ApiError.badRequest('유효하지 않은 플랜입니다.', 'invalid_plan')
  }

  const { data: hotel } = await service
    .from('hotels')
    .select('id, name, subscription_plan, pending_plan, plan_expires_at, toss_customer_key, toss_billing_key, billing_interval')
    .eq('id', hotelId)
    .single()

  if (!hotel) throw ApiError.notFound('호텔을 찾을 수 없습니다.', 'hotel_not_found')

  const currentPlan = hotel.subscription_plan as string
  const currentInterval = toBillingInterval(hotel.billing_interval)
  // 주기를 명시하지 않으면 현재 주기를 유지한다
  const interval: BillingInterval =
    targetInterval === 'yearly' ? 'yearly'
    : targetInterval === 'monthly' ? 'monthly'
    : currentInterval

  // 같은 플랜 — 주기 전환 요청만 처리 (다음 결제부터 적용)
  if (targetPlan === currentPlan) {
    if (interval === currentInterval) {
      throw ApiError.badRequest('이미 이용 중인 플랜입니다.', 'plan_already_active')
    }

    const { error } = await service
      .from('hotels')
      .update({ billing_interval: interval })
      .eq('id', hotelId)
    if (error) throw ApiError.internal()

    return NextResponse.json({
      ok: true,
      pending: true,
      intervalChanged: true,
      interval,
      effectiveAt: hotel.plan_expires_at,
    })
  }

  const isUpgrade = (PLAN_ORDER[targetPlan] ?? 0) > (PLAN_ORDER[currentPlan] ?? 0)

  // 다운그레이드 — 만료일부터 적용 (주기 전환 요청이 있으면 함께 저장)
  if (!isUpgrade) {
    const { error } = await service
      .from('hotels')
      .update({
        pending_plan: targetPlan,
        ...(interval !== currentInterval ? { billing_interval: interval } : {}),
      })
      .eq('id', hotelId)

    if (error) throw ApiError.internal()

    return NextResponse.json({
      ok: true,
      pending: true,
      plan: targetPlan,
      effectiveAt: hotel.plan_expires_at,
    })
  }

  // 업그레이드 — 빌링키가 없으면 결제 UI로 유도
  if (!hotel.toss_billing_key || !hotel.toss_customer_key) {
    return NextResponse.json({ requiresPayment: true, plan: targetPlan })
  }

  const amount = getPlanAmount(targetPlan, interval)
  if (!amount) throw ApiError.badRequest('유효하지 않은 플랜입니다.', 'invalid_plan')

  const result = await chargeBillingKey({
    billingKey: hotel.toss_billing_key,
    customerKey: hotel.toss_customer_key,
    amount,
    orderId: buildOrderId(hotelId),
    orderName: buildOrderName(targetPlan, interval),
    hotelId,
    plan: targetPlan,
  })

  if (!result.success) {
    throw ApiError.paymentRequired(
      result.failureReason ?? '결제에 실패했습니다. 카드를 확인해주세요.',
    )
  }

  await activateSubscription(service, { hotelId, plan: targetPlan, interval })

  return NextResponse.json({ ok: true, charged: true, plan: targetPlan, interval })
}

export const POST = withApiError(postHandler)
