import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { ApiError, withApiError } from '@/lib/api-error'
import { addMonths } from '@/lib/date'
import { PLAN_PRICES } from '@/lib/toss'

/**
 * Toss 결제 상태 웹훅 (T-082)
 * 동일 paymentKey 중복 수신은 payment_logs로 멱등 처리한다.
 */

/** 결제 금액 → 플랜 역매핑 (PLAN_PRICES의 역방향, 단일 출처 유지) */
const PLAN_BY_AMOUNT: Record<number, string> = Object.fromEntries(
  Object.entries(PLAN_PRICES).map(([plan, amount]) => [amount, plan]),
)

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

async function postHandler(request: NextRequest) {
  const expected = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET
  const provided = request.headers.get('x-toss-signature') ?? request.headers.get('authorization')

  if (!expected || !provided || !safeEqual(provided, expected)) {
    throw ApiError.badRequest('서명이 올바르지 않습니다.', 'invalid_signature')
  }

  const event = await request.json()
  if (event.eventType !== 'PAYMENT_STATUS_CHANGED') {
    return NextResponse.json({ received: true, ignored: true })
  }

  const service = createServiceClient()
  const payment = event.data ?? {}
  const customerKey = payment.metadata?.customerKey ?? payment.customerKey

  if (payment.status === 'CANCELED') {
    if (customerKey) {
      await service
        .from('hotels')
        .update({ subscription_plan: 'trial', toss_billing_key: null })
        .eq('toss_customer_key', customerKey)
    }
    return NextResponse.json({ received: true })
  }

  if (payment.status !== 'DONE') return NextResponse.json({ received: true })

  // 멱등성 — 같은 paymentKey를 이미 처리했으면 무시
  if (payment.paymentKey) {
    const { data: existing } = await service
      .from('payment_logs')
      .select('id')
      .eq('toss_payment_key', payment.paymentKey)
      .maybeSingle()
    if (existing) return NextResponse.json({ received: true, duplicate: true })
  }

  const plan = PLAN_BY_AMOUNT[payment.totalAmount]
  if (!customerKey || !plan) return NextResponse.json({ received: true, ignored: true })

  const nextExpiry = addMonths(new Date(), 1)

  const { data: hotel } = await service
    .from('hotels')
    .select('id')
    .eq('toss_customer_key', customerKey)
    .maybeSingle()

  if (hotel && payment.paymentKey) {
    await service.from('payment_logs').insert({
      hotel_id: hotel.id,
      toss_payment_key: payment.paymentKey,
      amount: payment.totalAmount,
      plan,
      status: 'success',
      next_billing_at: nextExpiry.toISOString(),
      raw_event: event,
    })
  }

  await service
    .from('hotels')
    .update({ subscription_plan: plan, plan_expires_at: nextExpiry.toISOString() })
    .eq('toss_customer_key', customerKey)

  return NextResponse.json({ received: true })
}

export const POST = withApiError(postHandler)
