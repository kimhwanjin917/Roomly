import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { chargeBillingKey, buildOrderId, PLAN_PRICES, PLAN_LABELS } from '@/lib/toss'
import { withApiError } from '@/lib/api-error'

/**
 * 플랜 변경 (T-025)
 * - 업그레이드: 빌링키 있으면 즉시 청구 후 플랜 적용, 없으면 결제 UI 유도
 * - 다운그레이드: pending_plan에 저장 (만료일부터 적용)
 */

const PLAN_ORDER: Record<string, number> = { trial: 0, starter: 1, standard: 2, pro: 3 }

async function postHandler(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string | undefined
  if (!hotelId) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const { targetPlan } = await req.json()
  if (!PLAN_PRICES[targetPlan]) {
    return NextResponse.json({ error: '유효하지 않은 플랜입니다.', code: 'invalid_plan' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: hotel } = await service
    .from('hotels')
    .select('id, name, subscription_plan, pending_plan, plan_expires_at, toss_customer_key, toss_billing_key')
    .eq('id', hotelId)
    .single()

  if (!hotel) return NextResponse.json({ error: '호텔을 찾을 수 없습니다.', code: 'hotel_not_found' }, { status: 404 })

  const currentPlan = hotel.subscription_plan as string
  if (targetPlan === currentPlan) {
    return NextResponse.json({ error: '이미 이용 중인 플랜입니다.', code: 'plan_already_active' }, { status: 400 })
  }

  const isUpgrade = (PLAN_ORDER[targetPlan] ?? 0) > (PLAN_ORDER[currentPlan] ?? 0)

  if (isUpgrade) {
    // 빌링키 없으면 결제 UI로 유도
    if (!hotel.toss_billing_key || !hotel.toss_customer_key) {
      return NextResponse.json({ requiresPayment: true, plan: targetPlan })
    }

    const amount = PLAN_PRICES[targetPlan]
    const result = await chargeBillingKey({
      billingKey: hotel.toss_billing_key,
      customerKey: hotel.toss_customer_key,
      amount,
      orderId: buildOrderId(hotelId),
      orderName: `Roomly ${PLAN_LABELS[targetPlan] ?? targetPlan} 플랜 (월간)`,
      hotelId,
      plan: targetPlan,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.failureReason ?? '결제에 실패했습니다. 카드를 확인해주세요.', code: 'payment_failed' },
        { status: 402 }
      )
    }

    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)
    await service
      .from('hotels')
      .update({
        subscription_plan: targetPlan,
        pending_plan: null,
        plan_expires_at: expiresAt.toISOString(),
      })
      .eq('id', hotelId)

    return NextResponse.json({ ok: true, charged: true, plan: targetPlan })
  }

  // 다운그레이드: 만료일부터 적용
  const { error } = await service
    .from('hotels')
    .update({ pending_plan: targetPlan })
    .eq('id', hotelId)

  if (error) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })

  return NextResponse.json({
    ok: true,
    pending: true,
    plan: targetPlan,
    effectiveAt: hotel.plan_expires_at,
  })
}

export const POST = withApiError(postHandler)
