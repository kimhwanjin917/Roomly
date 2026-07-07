import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { issueBillingKey, chargeBillingKey, buildOrderId, getPlanAmount, PLAN_PRICES, PLAN_LABELS, INTERVAL_LABELS, type BillingInterval } from '@/lib/toss'
import { withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import ReceiptEmail from '@/emails/ReceiptEmail'

/**
 * Toss 빌링 인증 성공 콜백 (T-096)
 * requestBillingAuth 성공 시 Toss가 authKey/customerKey를 붙여 리다이렉트.
 * 빌링키 발급 → hotels.toss_billing_key 저장 → 첫 결제 즉시 청구.
 */
async function getHandler(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const failRedirect = (reason?: string) =>
    NextResponse.redirect(
      `${appUrl}/admin/billing?fail=true${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`
    )

  const { searchParams } = new URL(req.url)
  const authKey = searchParams.get('authKey')
  const customerKey = searchParams.get('customerKey')
  const plan = searchParams.get('plan') ?? ''
  // T-201: 결제 주기 (yearly = 2개월 무료)
  const interval: BillingInterval = searchParams.get('interval') === 'yearly' ? 'yearly' : 'monthly'

  if (!authKey || !customerKey || !PLAN_PRICES[plan]) {
    return failRedirect('잘못된 요청입니다.')
  }

  // 관리자 세션 확인 (브라우저 리다이렉트이므로 쿠키 존재)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  const hotelId = user.app_metadata?.hotel_id as string | undefined
  if (!hotelId) return failRedirect('권한이 없습니다.')

  const service = createServiceClient()
  const { data: hotel } = await service
    .from('hotels')
    .select('id, name, toss_customer_key')
    .eq('id', hotelId)
    .single()

  // customerKey 위변조 방지
  if (!hotel || hotel.toss_customer_key !== customerKey) {
    return failRedirect('고객 정보가 일치하지 않습니다.')
  }

  // 1) 빌링키 발급
  let billingKey: string
  try {
    const issued = await issueBillingKey(authKey, customerKey)
    billingKey = issued.billingKey
  } catch (e) {
    return failRedirect(e instanceof Error ? e.message : '빌링키 발급에 실패했습니다.')
  }

  await service.from('hotels').update({ toss_billing_key: billingKey }).eq('id', hotelId)

  // 2) 첫 결제 즉시 청구
  const amount = getPlanAmount(plan, interval)!
  const result = await chargeBillingKey({
    billingKey,
    customerKey,
    amount,
    orderId: buildOrderId(hotelId),
    orderName: `Roomly ${PLAN_LABELS[plan] ?? plan} 플랜 (${INTERVAL_LABELS[interval]})`,
    hotelId,
    plan,
  })

  if (!result.success) {
    return failRedirect(result.failureReason ?? '결제에 실패했습니다.')
  }

  // 3) 구독 활성화 (월간 1개월 / 연간 1년)
  const expiresAt = new Date()
  if (interval === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  else expiresAt.setMonth(expiresAt.getMonth() + 1)
  await service
    .from('hotels')
    .update({
      subscription_plan: plan,
      plan_expires_at: expiresAt.toISOString(),
      pending_plan: null,
      billing_interval: interval,
    })
    .eq('id', hotelId)

  // T-197: 첫 결제 영수증 이메일 (비차단)
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: '[Roomly] 결제 영수증',
      react: ReceiptEmail({
        hotelName: hotel.name as string,
        plan: PLAN_LABELS[plan] ?? plan,
        amount,
        nextBillingDate: expiresAt.toLocaleDateString('ko-KR', {
          year: 'numeric', month: 'long', day: 'numeric',
        }),
      }),
      hotelId,
    }).catch(() => {})
  }

  return NextResponse.redirect(`${appUrl}/admin/billing?success=true`)
}

export const GET = withApiError(getHandler)
