import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

const PLAN_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  standard: process.env.STRIPE_PRICE_STANDARD ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json()
  const priceId = PLAN_PRICES[plan]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const { data: hotel } = await supabase
    .from('hotels')
    .select('id, stripe_customer_id')
    .single()

  let customerId = hotel?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { hotel_id: hotel?.id ?? '' },
    })
    customerId = customer.id
    await supabase.from('hotels').update({ stripe_customer_id: customerId }).eq('id', hotel?.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 30 },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`,
  })

  return NextResponse.json({ url: session.url })
}
