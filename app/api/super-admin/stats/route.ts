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

  const now = new Date()
  const nowIso = now.toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [hotelsRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from('hotels')
      .select('id, subscription_plan, toss_billing_key, plan_expires_at, created_at'),
    supabaseAdmin
      .from('payment_logs')
      .select('amount, status, created_at')
      .eq('status', 'success')
      .gte('created_at', thirtyDaysAgo),
  ])

  if (hotelsRes.error || paymentsRes.error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const hotels = hotelsRes.data ?? []
  const payments = paymentsRes.data ?? []

  const total = hotels.length
  const active = hotels.filter(h => h.plan_expires_at && h.plan_expires_at > nowIso).length
  const paid = hotels.filter(h => h.toss_billing_key != null).length
  const expired = hotels.filter(h => !h.plan_expires_at || h.plan_expires_at <= nowIso).length

  // MRR: 최근 30일 성공 결제 합계 (payment_logs 집계)
  const mrr = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  // 플랜별 호텔 수
  const planCounts: Record<string, number> = { trial: 0, starter: 0, standard: 0, pro: 0 }
  for (const h of hotels) {
    const plan = h.subscription_plan ?? 'trial'
    planCounts[plan] = (planCounts[plan] ?? 0) + 1
  }

  // 최근 30일 가입 추이 (일별)
  const signupTrend: { date: string; count: number }[] = []
  const countMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    countMap[d.toISOString().slice(0, 10)] = 0
  }
  for (const h of hotels) {
    const key = (h.created_at as string)?.slice(0, 10)
    if (key in countMap) countMap[key]++
  }
  for (const [date, count] of Object.entries(countMap)) {
    signupTrend.push({ date, count })
  }

  return NextResponse.json({ total, active, paid, expired, mrr, planCounts, signupTrend })
}
