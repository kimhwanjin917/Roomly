import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { HttpError, withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import { appUrl } from '@/lib/constants'
import {
  issueBillingKey,
  chargeBillingKey,
  buildOrderId,
  buildOrderName,
  getPlanAmount,
  activateSubscription,
  toBillingInterval,
  PLAN_PRICES,
  PLAN_LABELS,
} from '@/lib/toss'
import ReceiptEmail from '@/emails/ReceiptEmail'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/**
 * Toss 빌링 인증 성공 콜백 (T-096)
 * requestBillingAuth 성공 시 Toss가 authKey/customerKey를 붙여 리다이렉트한다.
 * 빌링키 발급 → hotels.toss_billing_key 저장 → 첫 결제 즉시 청구.
 *
 * 브라우저 리다이렉트 흐름이므로 실패는 JSON이 아니라 billing 페이지로 되돌린다.
 */
function failRedirect(reason: string) {
  return NextResponse.redirect(
    `${appUrl()}/admin/billing?fail=true&reason=${encodeURIComponent(reason)}`,
  )
}

async function getHandler(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const authKey = params.get('authKey')
  const customerKey = params.get('customerKey')
  const plan = params.get('plan') ?? ''
  const interval = toBillingInterval(params.get('interval'))

  if (!authKey || !customerKey || !PLAN_PRICES[plan]) {
    return failRedirect('잘못된 요청입니다.')
  }

  // 관리자 세션 확인 (브라우저 리다이렉트이므로 쿠키가 있다)
  let ctx
  try {
    ctx = await requireAdmin()
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      return NextResponse.redirect(`${appUrl()}/login`)
    }
    throw err
  }
  const { hotelId, email, service } = ctx

  const { data: hotel } = await service
    .from('hotels')
    .select('id, name, toss_customer_key')
    .eq('id', hotelId)
    .single()

  // customerKey 위변조 방지 — 저장된 값과 일치해야 한다
  if (!hotel || hotel.toss_customer_key !== customerKey) {
    return failRedirect('고객 정보가 일치하지 않습니다.')
  }

  // 1) 빌링키 발급
  let billingKey: string
  try {
    ({ billingKey } = await issueBillingKey(authKey, customerKey))
  } catch (err) {
    return failRedirect(err instanceof Error ? err.message : '빌링키 발급에 실패했습니다.')
  }

  await service.from('hotels').update({ toss_billing_key: billingKey }).eq('id', hotelId)

  // 2) 첫 결제 즉시 청구
  const amount = getPlanAmount(plan, interval)
  if (!amount) return failRedirect('유효하지 않은 플랜입니다.')

  const result = await chargeBillingKey({
    billingKey,
    customerKey,
    amount,
    orderId: buildOrderId(hotelId),
    orderName: buildOrderName(plan, interval),
    hotelId,
    plan,
  })

  if (!result.success) {
    return failRedirect(result.failureReason ?? '결제에 실패했습니다.')
  }

  // 3) 구독 활성화
  const expiresAt = await activateSubscription(service, { hotelId, plan, interval })

  // 4) 영수증 메일 (비차단 — 실패해도 결제는 완료된 것)
  if (email) {
    sendEmail({
      to: email,
      subject: '[Roomly] 결제 영수증',
      react: ReceiptEmail({
        hotelName: hotel.name as string,
        planName: PLAN_LABELS[plan] ?? plan,
        amount,
        paidAt: new Date().toISOString(),
        nextBillingAt: expiresAt.toISOString(),
      }),
      hotelId,
      template: 'receipt',
    }).catch(() => {})
  }

  return NextResponse.redirect(`${appUrl()}/admin/billing?success=true`)
}

export const GET = withApiError(getHandler)
