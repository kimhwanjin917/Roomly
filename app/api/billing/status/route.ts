import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

/**
 * 현재 구독 상태 조회 (billing 페이지용)
 */
async function getHandler() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string | undefined
  if (!hotelId) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: hotel, error } = await service
    .from('hotels')
    .select('subscription_plan, pending_plan, plan_expires_at, toss_billing_key')
    .eq('id', hotelId)
    .single()

  if (error || !hotel) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })

  return NextResponse.json({
    plan: hotel.subscription_plan,
    pendingPlan: hotel.pending_plan,
    planExpiresAt: hotel.plan_expires_at,
    hasBillingKey: !!hotel.toss_billing_key,
  })
}

export const GET = withApiError(getHandler)
