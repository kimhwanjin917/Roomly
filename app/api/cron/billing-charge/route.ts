import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { chargeBillingKey } from '@/lib/toss'
import { sendEmail } from '@/lib/email'
import PaymentFailedEmail from '@/emails/PaymentFailedEmail'
import ReceiptEmail from '@/emails/ReceiptEmail'

const PLAN_AMOUNTS: Record<string, number> = {
  starter: 30000,
  standard: 70000,
  pro: 150000,
}

function addOneMonth(date: Date): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()

  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, subscription_plan, toss_billing_key, toss_customer_key, plan_expires_at, admin_email')
    .not('subscription_plan', 'in', '("trial")')
    .not('toss_billing_key', 'is', null)
    .lte('plan_expires_at', now.toISOString())

  if (!hotels?.length) return NextResponse.json({ charged: 0, failed: 0 })

  let charged = 0
  let failed = 0

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'

  for (const hotel of hotels) {
    const amount = PLAN_AMOUNTS[hotel.subscription_plan]
    if (!amount || !hotel.toss_billing_key || !hotel.toss_customer_key) { failed++; continue }

    const adminEmail = hotel.admin_email
    if (!adminEmail) { failed++; continue }

    try {
      const orderId = `roomly_${hotel.id}_${Date.now()}`
      await chargeBillingKey({
        billingKey: hotel.toss_billing_key,
        customerKey: hotel.toss_customer_key,
        amount,
        orderId,
        orderName: `Roomly ${hotel.subscription_plan} 플랜`,
        customerEmail: adminEmail,
        customerName: hotel.name,
      })

      const nextExpiry = addOneMonth(new Date(hotel.plan_expires_at))

      await service.from('hotels').update({
        plan_expires_at: nextExpiry.toISOString(),
      }).eq('id', hotel.id)

      charged++

      await sendEmail({
        to: adminEmail,
        subject: `[Roomly] ${hotel.name} 구독 결제가 완료되었습니다`,
        react: ReceiptEmail({
          hotelName: hotel.name,
          planName: hotel.subscription_plan,
          amount,
          paidAt: now.toISOString(),
          nextBillingAt: nextExpiry.toISOString(),
        }),
        hotelId: hotel.id,
        template: 'receipt',
      })
    } catch (err) {
      console.error(`[billing-charge] 결제 실패 hotel=${hotel.id}:`, err)
      failed++

      await service.from('hotels').update({
        subscription_plan: 'trial',
        toss_billing_key: null,
      }).eq('id', hotel.id)

      await sendEmail({
        to: adminEmail,
        subject: '[Roomly] 자동 결제에 실패했습니다',
        react: PaymentFailedEmail({
          hotelName: hotel.name,
          planName: hotel.subscription_plan,
          amount,
          failedAt: now.toISOString(),
          billingUrl: `${appUrl}/admin/billing`,
        }),
        hotelId: hotel.id,
        template: 'payment_failed',
      })
    }
  }

  return NextResponse.json({ charged, failed })
}
