import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { daysAgo } from '@/lib/date'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


const TREND_DAYS = 30

async function getHandler() {
  const { service } = requireSuperAdmin()

  const now = new Date()
  const nowIso = now.toISOString()
  const windowStart = daysAgo(TREND_DAYS, now)

  const [hotelsRes, paymentsRes] = await Promise.all([
    service.from('hotels').select('id, subscription_plan, toss_billing_key, plan_expires_at, created_at'),
    service
      .from('payment_logs')
      .select('amount, status, created_at')
      .eq('status', 'success')
      .gte('created_at', windowStart.toISOString()),
  ])

  if (hotelsRes.error || paymentsRes.error) {
    console.error('[super-admin/stats]', hotelsRes.error ?? paymentsRes.error)
    throw ApiError.internal()
  }

  const hotels = hotelsRes.data ?? []
  const payments = paymentsRes.data ?? []

  const isActive = (h: { plan_expires_at: string | null }) =>
    !!h.plan_expires_at && h.plan_expires_at > nowIso

  // 최근 30일 성공 결제 합계
  const mrr = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const planCounts: Record<string, number> = { trial: 0, starter: 0, standard: 0, pro: 0 }
  for (const h of hotels) {
    const plan = h.subscription_plan ?? 'trial'
    planCounts[plan] = (planCounts[plan] ?? 0) + 1
  }

  // 일별 가입 추이 — 데이터가 없는 날도 0으로 채운다
  const counts = new Map<string, number>()
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    counts.set(daysAgo(i, now).toISOString().slice(0, 10), 0)
  }
  for (const h of hotels) {
    const key = (h.created_at as string | null)?.slice(0, 10)
    if (key && counts.has(key)) counts.set(key, counts.get(key)! + 1)
  }

  return NextResponse.json({
    total: hotels.length,
    active: hotels.filter(isActive).length,
    paid: hotels.filter(h => h.toss_billing_key != null).length,
    expired: hotels.filter(h => !isActive(h)).length,
    mrr,
    planCounts,
    signupTrend: Array.from(counts, ([date, count]) => ({ date, count })),
  })
}

export const GET = withApiError(getHandler)
