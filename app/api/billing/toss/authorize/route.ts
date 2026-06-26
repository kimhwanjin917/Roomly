import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { issueBillingKey, chargeBillingKey } from '@/lib/toss'

// setMonth()는 월말 오버플로우 버그(1/31 → 3/3) 있음 — 말일을 다음 달 말일로 고정
function addOneMonth(date: Date): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

const PLAN_INFO: Record<string, { name: string; amount: number; roomLimit: number }> = {
  starter:  { name: '스타터',   amount: 30000,  roomLimit: 50 },
  standard: { name: '스탠다드', amount: 70000,  roomLimit: 150 },
  pro:      { name: '프로',     amount: 150000, roomLimit: 9999 },
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { authKey, customerKey, plan } = await req.json()
  if (!authKey || !customerKey || !plan) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  }

  const planInfo = PLAN_INFO[plan]
  if (!planInfo) return NextResponse.json({ error: 'invalid plan' }, { status: 400 })

  const service = createServiceClient()

  const { data: hotel } = await service
    .from('hotels')
    .select('id, name, trial_ends_at')
    .eq('toss_customer_key', customerKey)
    .single()

  if (!hotel) return NextResponse.json({ error: 'hotel not found' }, { status: 404 })

  let billingKey: string
  try {
    const result = await issueBillingKey(authKey, customerKey)
    billingKey = result.billingKey
  } catch (err) {
    console.error('[toss/authorize] 빌링키 발급 실패:', err)
    return NextResponse.json(
      { error: 'billing_key_failed', message: err instanceof Error ? err.message : '빌링키 발급 오류' },
      { status: 402 },
    )
  }

  const now = new Date()
  const trialEnd = hotel.trial_ends_at ? new Date(hotel.trial_ends_at) : null
  const isInTrial = trialEnd ? trialEnd > now : false

  // 체험 기간 아닌 경우 결제 먼저 — 결제 실패 시 DB 업데이트 안 함
  if (!isInTrial) {
    try {
      const orderId = `roomly_${hotel.id}_${Date.now()}`
      await chargeBillingKey({
        billingKey,
        customerKey,
        amount: planInfo.amount,
        orderId,
        orderName: `Roomly ${planInfo.name} 플랜`,
        customerEmail: user.email ?? '',
        customerName: hotel.name,
      })
    } catch (err) {
      console.error('[toss/authorize] 최초 결제 실패:', err)
      return NextResponse.json(
        { error: 'payment_failed', message: err instanceof Error ? err.message : '결제 오류' },
        { status: 402 },
      )
    }
  }

  const nextExpiry = addOneMonth(now)

  await service.from('hotels').update({
    toss_billing_key: billingKey,
    subscription_plan: plan,
    plan_expires_at: isInTrial ? trialEnd!.toISOString() : nextExpiry.toISOString(),
  }).eq('id', hotel.id)

  return NextResponse.json({ success: true, trial: isInTrial })
}
