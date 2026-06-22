import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const customerId = session.customer
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('hotels')
      .update({ stripe_subscription_id: session.subscription, plan_expires_at: expiresAt })
      .eq('stripe_customer_id', customerId)
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any
    const nextPayment = new Date(invoice.lines.data[0]?.period?.end * 1000).toISOString()
    await supabaseAdmin
      .from('hotels')
      .update({ plan_expires_at: nextPayment })
      .eq('stripe_customer_id', invoice.customer)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as any
    const midnight = new Date()
    midnight.setHours(23, 59, 59, 999)
    await supabaseAdmin
      .from('hotels')
      .update({ plan_expires_at: midnight.toISOString() })
      .eq('stripe_customer_id', sub.customer)
  }

  return NextResponse.json({ received: true })
}
