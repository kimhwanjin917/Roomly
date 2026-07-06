import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import PaymentFailedEmail from '@/emails/PaymentFailedEmail'
import { parseHotelIdFromOrderId, PLAN_LABELS } from '@/lib/toss'

/**
 * Toss Payments 웹훅 (T-096, T-082)
 * PAYMENT_STATUS_CHANGED 이벤트 처리.
 * - DONE → 구독 갱신 + payment_logs INSERT(success)
 * - CANCELED / ABORTED / EXPIRED → 실패 처리 + payment_logs INSERT(failed) + 실패 이메일
 * 멱등성: payment_logs.toss_order_id UNIQUE 제약으로 중복 orderId 스킵.
 */

const FAIL_STATUSES = ['CANCELED', 'ABORTED', 'EXPIRED']

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET
  if (!secret) return true // 시크릿 미설정 시 검증 생략
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  if (!verifySignature(rawBody, req.headers.get('x-toss-signature'))) {
    // 보안상 상세 에러 노출 금지 (BILLING-04)
    return NextResponse.json({ error: 'Invalid signature', code: 'invalid_signature' }, { status: 400 })
  }

  let event: { eventType?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload', code: 'invalid_payload' }, { status: 400 })
  }

  if (event.eventType !== 'PAYMENT_STATUS_CHANGED' || !event.data) {
    return NextResponse.json({ received: true })
  }

  const payment = event.data as {
    orderId?: string
    status?: string
    totalAmount?: number
    failure?: { code?: string; message?: string }
  }
  const orderId = payment.orderId ?? ''
  const status = payment.status ?? ''
  const amount = payment.totalAmount ?? 0

  const hotelId = parseHotelIdFromOrderId(orderId)
  if (!hotelId) return NextResponse.json({ received: true })

  const service = createServiceClient()
  const { data: hotel } = await service
    .from('hotels')
    .select('id, name, subscription_plan, pending_plan, plan_expires_at')
    .eq('id', hotelId)
    .single()
  if (!hotel) return NextResponse.json({ received: true })

  const isSuccess = status === 'DONE'
  const isFailure = FAIL_STATUSES.includes(status)
  if (!isSuccess && !isFailure) return NextResponse.json({ received: true })

  const failureReason =
    payment.failure?.message ?? (isFailure ? `결제 상태: ${status}` : null)

  // 멱등성 (T-082): UNIQUE 제약 위반(23505) → 이미 처리된 orderId → 스킵
  const { error: insertError } = await service.from('payment_logs').insert({
    hotel_id: hotelId,
    toss_order_id: orderId,
    amount,
    plan: hotel.subscription_plan,
    status: isSuccess ? 'success' : 'failed',
    failure_reason: isFailure ? failureReason : null,
  })
  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    return NextResponse.json({ error: 'DB error', code: 'db_error' }, { status: 500 })
  }

  if (isSuccess) {
    // 구독 갱신: pending_plan이 있으면 플랜 교체, 만료일 +1개월
    const base = hotel.plan_expires_at && hotel.plan_expires_at > new Date().toISOString()
      ? new Date(hotel.plan_expires_at)
      : new Date()
    base.setMonth(base.getMonth() + 1)
    await service
      .from('hotels')
      .update({
        subscription_plan: hotel.pending_plan ?? hotel.subscription_plan,
        pending_plan: null,
        plan_expires_at: base.toISOString(),
      })
      .eq('id', hotelId)
  } else {
    // 실패 처리: trial로 되돌리기 + 실패 이메일 발송
    await service
      .from('hotels')
      .update({ subscription_plan: 'trial' })
      .eq('id', hotelId)

    const emailProps = {
      hotelName: hotel.name as string,
      failureReason: failureReason ?? '알 수 없는 오류',
      amount,
      plan: PLAN_LABELS[hotel.subscription_plan as string] ?? hotel.subscription_plan,
    }

    // 운영자 알림 (T-082)
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
    if (superAdminEmail) {
      await sendEmail({
        to: superAdminEmail,
        subject: `[Roomly] ${hotel.name} 결제 실패 알림`,
        react: PaymentFailedEmail(emailProps),
      }).catch(() => {})
    }

    // 호텔 관리자 알림 (T-086)
    try {
      const {
        data: { users },
      } = await service.auth.admin.listUsers()
      const adminUser = users.find((u) => u.app_metadata?.hotel_id === hotelId)
      if (adminUser?.email) {
        await sendEmail({
          to: adminUser.email,
          subject: '[Roomly] 결제에 실패했습니다',
          react: PaymentFailedEmail(emailProps),
        })
      }
    } catch {
      // 이메일 실패는 무시
    }
  }

  return NextResponse.json({ received: true })
}
