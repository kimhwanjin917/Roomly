import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ApiError, withApiError } from '@/lib/api-error'
import { applyPmsEvent } from '@/lib/pms/apply'

/**
 * 표준 PMS 웹훅 — 이미 정규화된 이벤트를 받는다.
 * 전역 PMS_WEBHOOK_SECRET으로 인증한다 (호텔별 시크릿은 어댑터 엔드포인트에서 검증).
 */
async function postHandler(request: NextRequest) {
  const expected = process.env.PMS_WEBHOOK_SECRET
  const provided = request.headers.get('x-roomly-webhook-secret')
  if (!expected || provided !== expected) {
    throw ApiError.unauthorized('웹훅 시크릿이 올바르지 않습니다.')
  }

  const { hotelId, externalRoomId, action, checkinTime } = await request.json()
  if (!hotelId || !externalRoomId || !action) {
    throw ApiError.badRequest('hotelId, externalRoomId, action이 필요합니다.')
  }

  await applyPmsEvent(createServiceClient(), hotelId, { externalRoomId, action, checkinTime })

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
