import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import PaymentFailedEmail from '@/emails/PaymentFailedEmail'
import { chargeBillingKey, buildOrderId, PLAN_PRICES, PLAN_LABELS } from '@/lib/toss'

/**
 * 정기 결제 크론 (T-096)
 * plan_expires_at이 도래한 호텔 중 toss_billing_key가 있는 호텔을 자동 청구.
 * - 성공 → plan_expires_at += 1개월 (pending_plan 있으면 플랜 교체 후 NULL)
 * - 실패 → PaymentFailedEmail 발송 + subscription_plan='trial' 되돌리기
 * - toss_billing_key NULL → 스킵
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const nowIso = new Date().toISOString()

  // 만료 도래 호텔 조회
  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, subscription_plan, pending_plan, plan_expires_at, toss_customer_key, toss_billing_key')
    .lte('plan_expires_at', nowIso)

  if (!hotels?.length) return NextResponse.json({ charged: 0, failed: 0, skipped: 0 })

  // 호텔 관리자 이메일 조회용
  let users: { email?: string; app_metadata?: Record<string, unknown> }[] = []
  try {
    const { data } = await service.auth.admin.listUsers()
    users = data.users
  } catch {
    // 이메일 발송 없이 진행
  }

  let charged = 0
  let failed = 0
  let skipped = 0

  for (const hotel of hotels) {
    // 빌링키 없으면 스킵 (해지 상태 포함)
    if (!hotel.toss_billing_key || !hotel.toss_customer_key) {
      skipped++
      continue
    }

    // 청구할 플랜: pending_plan 우선, 없으면 현재 플랜
    const targetPlan = (hotel.pending_plan ?? hotel.subscription_plan) as string
    const amount = PLAN_PRICES[targetPlan]
    if (!amount) {
      skipped++
      continue
    }

    const result = await chargeBillingKey({
      billingKey: hotel.toss_billing_key,
      customerKey: hotel.toss_customer_key,
      amount,
      orderId: buildOrderId(hotel.id),
      orderName: `Roomly ${PLAN_LABELS[targetPlan] ?? targetPlan} 플랜 (월간)`,
      hotelId: hotel.id,
      plan: targetPlan,
    })

    if (result.success) {
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)
      await service
        .from('hotels')
        .update({
          subscription_plan: targetPlan,
          pending_plan: null,
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq('id', hotel.id)
      charged++
    } else {
      // 실패: trial로 되돌리기 + 실패 이메일
      await service
        .from('hotels')
        .update({ subscription_plan: 'trial' })
        .eq('id', hotel.id)

      const emailProps = {
        hotelName: hotel.name as string,
        failureReason: result.failureReason ?? '알 수 없는 오류',
        amount,
        plan: PLAN_LABELS[targetPlan] ?? targetPlan,
      }

      const adminUser = users.find((u) => u.app_metadata?.hotel_id === hotel.id)
      if (adminUser?.email) {
        await sendEmail({
          to: adminUser.email,
          subject: '[Roomly] 결제에 실패했습니다',
          react: PaymentFailedEmail(emailProps),
        }).catch(() => {})
      }
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
      if (superAdminEmail) {
        await sendEmail({
          to: superAdminEmail,
          subject: `[Roomly] ${hotel.name} 결제 실패 알림`,
          react: PaymentFailedEmail(emailProps),
        }).catch(() => {})
      }
      failed++
    }
  }

  return NextResponse.json({ charged, failed, skipped })
}
