import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { PLAN_PRICES, toBillingInterval } from '@/lib/toss'
import { appUrl } from '@/lib/constants'

/**
 * Toss 빌링 인증 세션 생성 (T-096)
 * 클라이언트는 응답의 clientKey/customerKey/successUrl/failUrl로
 * requestBillingAuth('카드', ...)를 호출한다.
 * 인증 성공 시 Toss가 successUrl로 authKey/customerKey를 붙여 리다이렉트 →
 * /api/billing/success 콜백에서 빌링키 발급 + 첫 결제 청구.
 */
async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { plan, interval } = await request.json() as { plan?: string; interval?: string }
  if (!plan || !PLAN_PRICES[plan]) throw ApiError.badRequest('유효하지 않은 플랜입니다.', 'invalid_plan')

  const billingInterval = toBillingInterval(interval)

  const { data: hotel } = await service
    .from('hotels')
    .select('id, toss_customer_key')
    .eq('id', hotelId)
    .single()

  if (!hotel) throw ApiError.notFound('호텔을 찾을 수 없습니다.', 'hotel_not_found')

  // customerKey가 없으면 생성 후 저장 (Toss 빌링키는 이 값에 묶인다)
  let customerKey = hotel.toss_customer_key as string | null
  if (!customerKey) {
    customerKey = `cus_${randomUUID()}`
    const { error } = await service
      .from('hotels')
      .update({ toss_customer_key: customerKey })
      .eq('id', hotelId)
    if (error) throw ApiError.internal('고객 키 생성에 실패했습니다.', 'customer_key_failed')
  }

  const base = appUrl()
  return NextResponse.json({
    clientKey: process.env.TOSS_PAYMENTS_CLIENT_KEY ?? '',
    customerKey,
    successUrl: `${base}/api/billing/success?plan=${plan}&interval=${billingInterval}`,
    failUrl: `${base}/admin/billing?fail=true`,
  })
}

export const POST = withApiError(postHandler)
