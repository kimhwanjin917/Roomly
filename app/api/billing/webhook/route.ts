import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// setMonth()는 월말 오버플로우 버그(1/31 → 3/3) 있음
function addOneMonth(date: Date): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

const PLAN_AMOUNTS: Record<number, { plan: string; roomLimit: number }> = {
  30000:  { plan: 'starter',  roomLimit: 50 },
  70000:  { plan: 'standard', roomLimit: 150 },
  150000: { plan: 'pro',      roomLimit: 9999 },
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-toss-signature') ?? req.headers.get('authorization')
  if (secret !== process.env.TOSS_PAYMENTS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const event = await req.json()
  const supabase = getSupabaseAdmin()

  if (event.eventType === 'PAYMENT_STATUS_CHANGED') {
    const payment = event.data
    if (payment.status === 'DONE') {
      const planInfo = PLAN_AMOUNTS[payment.totalAmount]
      const customerKey = payment.metadata?.customerKey ?? payment.customerKey

      if (customerKey && planInfo) {
        const nextExpiry = addOneMonth(new Date())

        await supabase.from('hotels')
          .update({
            subscription_plan: planInfo.plan,
            plan_expires_at: nextExpiry.toISOString(),
          })
          .eq('toss_customer_key', customerKey)
      }
    }

    if (payment.status === 'CANCELED') {
      const customerKey = payment.metadata?.customerKey ?? payment.customerKey
      if (customerKey) {
        await supabase.from('hotels')
          .update({
            subscription_plan: 'trial',
            toss_billing_key: null,
          })
          .eq('toss_customer_key', customerKey)
      }
    }
  }

  return NextResponse.json({ received: true })
}
