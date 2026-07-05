import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * 구독 해지 (T-026)
 * 빌링키/예약 플랜만 제거하고 plan_expires_at은 유지 → 기간 만료 후 중단.
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string | undefined
  if (!hotelId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { error } = await service
    .from('hotels')
    .update({ toss_billing_key: null, pending_plan: null })
    .eq('id', hotelId)

  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
