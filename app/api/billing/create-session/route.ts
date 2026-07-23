import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { PLAN_PRICES } from '@/lib/toss'
import { withApiError } from '@/lib/api-error'

/**
 * Toss 빌링 인증 세션 생성 (T-096)
 * 클라이언트는 응답의 clientKey/customerKey/successUrl/failUrl로
 * requestBillingAuth('카드', ...)를 호출한다.
 * 인증 성공 시 Toss가 successUrl로 authKey/customerKey를 붙여 리다이렉트 →
 * /api/billing/success 콜백에서 빌링키 발급 + 첫 결제 청구.
 */
async function postHandler(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })

  const { plan, interval } = await req.json() as { plan: string; interval?: string }
  if (!PLAN_PRICES[plan]) {
    return NextResponse.json({ error: '유효하지 않은 플랜입니다.', code: 'invalid_plan' }, { status: 400 })
  }
  // T-201: 결제 주기 (기본 월간)
  const billingInterval = interval === 'yearly' ? 'yearly' : 'monthly'

  const hotelId = user.app_metadata?.hotel_id as string | undefined
  if (!hotelId) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: hotel } = await service
    .from('hotels')
    .select('id, toss_customer_key')
    .eq('id', hotelId)
    .single()

  if (!hotel) return NextResponse.json({ error: '호텔을 찾을 수 없습니다.', code: 'hotel_not_found' }, { status: 404 })

  // customerKey가 없으면 생성 후 저장
  let customerKey = hotel.toss_customer_key as string | null
  if (!customerKey) {
    customerKey = `cus_${randomUUID()}`
    const { error } = await service
      .from('hotels')
      .update({ toss_customer_key: customerKey })
      .eq('id', hotelId)
    if (error) {
      return NextResponse.json({ error: '고객 키 생성에 실패했습니다.', code: 'customer_key_failed' }, { status: 500 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return NextResponse.json({
    clientKey: process.env.TOSS_PAYMENTS_CLIENT_KEY ?? '',
    customerKey,
    successUrl: `${appUrl}/api/billing/success?plan=${plan}&interval=${billingInterval}`,
    failUrl: `${appUrl}/admin/billing?fail=true`,
  })
}

export const POST = withApiError(postHandler)
