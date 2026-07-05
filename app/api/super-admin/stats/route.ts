import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function verifySession() {
  const cookieStore = cookies()
  const session = cookieStore.get('super_admin_session')?.value
  if (!session) return false
  return session === process.env.SUPER_ADMIN_PASSWORD_HASH
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  if (!verifySession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()

  const { data: hotels, error } = await supabaseAdmin
    .from('hotels')
    .select('id, stripe_subscription_id, plan_expires_at')

  if (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const list = hotels ?? []
  const total = list.length
  const active = list.filter(h => h.plan_expires_at && h.plan_expires_at > now).length
  const paid = list.filter(h => h.stripe_subscription_id != null).length
  const expired = list.filter(h => !h.plan_expires_at || h.plan_expires_at <= now).length

  return NextResponse.json({ total, active, paid, expired })
}
