import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import { appUrl } from '@/lib/constants'
import {
  chargeBillingKey,
  buildOrderId,
  buildOrderName,
  getPlanAmount,
  activateSubscription,
  toBillingInterval,
  PLAN_LABELS,
} from '@/lib/toss'
import PaymentFailedEmail from '@/emails/PaymentFailedEmail'
import ReceiptEmail from '@/emails/ReceiptEmail'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/**
 * 만료된 구독의 자동 청구.
 * 성공 → 다음 주기로 연장 + 영수증 / 실패 → trial 강등 + 결제 실패 안내.
 */
async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)

  const now = new Date()
  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, subscription_plan, pending_plan, billing_interval, toss_billing_key, toss_customer_key, plan_expires_at, admin_email')
    .neq('subscription_plan', 'trial')
    .not('toss_billing_key', 'is', null)
    .lte('plan_expires_at', now.toISOString())

  if (!hotels?.length) return NextResponse.json({ charged: 0, failed: 0, skipped: 0 })

  let charged = 0
  let failed = 0
  let skipped = 0

  for (const hotel of hotels) {
    // 청구 대상: pending_plan(업/다운그레이드 예약) 우선, 없으면 현재 플랜
    const plan = (hotel.pending_plan ?? hotel.subscription_plan) as string
    const interval = toBillingInterval(hotel.billing_interval)
    const amount = getPlanAmount(plan, interval)

    if (!amount || !hotel.toss_billing_key || !hotel.toss_customer_key || !hotel.admin_email) {
      skipped++
      continue
    }

    const result = await chargeBillingKey({
      billingKey: hotel.toss_billing_key,
      customerKey: hotel.toss_customer_key,
      amount,
      orderId: buildOrderId(hotel.id),
      orderName: buildOrderName(plan, interval),
      hotelId: hotel.id,
      plan,
    })

    if (result.success) {
      const nextExpiry = await activateSubscription(service, {
        hotelId: hotel.id,
        plan,
        interval,
        from: now,
      })
      charged++

      await sendEmail({
        to: hotel.admin_email,
        subject: `[Roomly] ${hotel.name} 구독 결제가 완료되었습니다`,
        react: ReceiptEmail({
          hotelName: hotel.name,
          planName: PLAN_LABELS[plan] ?? plan,
          amount,
          paidAt: now.toISOString(),
          nextBillingAt: nextExpiry.toISOString(),
        }),
        hotelId: hotel.id,
        template: 'receipt',
      })
    } else {
      console.error(`[billing-charge] 결제 실패 hotel=${hotel.id}:`, result.failureReason)
      failed++

      await service
        .from('hotels')
        .update({ subscription_plan: 'trial', toss_billing_key: null })
        .eq('id', hotel.id)

      await sendEmail({
        to: hotel.admin_email,
        subject: '[Roomly] 자동 결제에 실패했습니다',
        react: PaymentFailedEmail({
          hotelName: hotel.name,
          planName: PLAN_LABELS[plan] ?? plan,
          amount,
          failedAt: now.toISOString(),
          billingUrl: `${appUrl()}/admin/billing`,
        }),
        hotelId: hotel.id,
        template: 'payment_failed',
      })
    }
  }

  return NextResponse.json({ charged, failed, skipped })
}

export const GET = withApiError(getHandler)
