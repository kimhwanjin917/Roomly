import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

/**
 * 결제 내역 조회 (T-027)
 * 관리자 세션의 hotel_id 기준 최근 20건.
 */
async function getHandler() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string | undefined
  if (!hotelId) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('payment_logs')
    .select('id, toss_order_id, amount, plan, status, failure_reason, created_at')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })

  return NextResponse.json({ invoices: data ?? [] })
}

export const GET = withApiError(getHandler)
