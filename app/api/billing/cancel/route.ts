import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'

/**
 * 구독 해지 (T-026)
 * 빌링키/예약 플랜만 제거하고 plan_expires_at은 유지 → 기간 만료 후 중단.
 */
async function postHandler() {
  const { hotelId, service } = await requireAdmin()

  const { error } = await service
    .from('hotels')
    .update({ toss_billing_key: null, pending_plan: null })
    .eq('id', hotelId)

  if (error) {
    console.error('[billing/cancel]', error)
    throw ApiError.internal()
  }

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
