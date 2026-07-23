import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ApiError, withApiError } from '@/lib/api-error'
import { parseCloudbedsEvent, type CloudbedsWebhookEvent } from '@/lib/pms/cloudbeds'
import { applyPmsEvent, verifyPmsSecret } from '@/lib/pms/apply'

/**
 * Cloudbeds PMS 어댑터 (T-202)
 * Mews 어댑터와 동일하게 X-Hotel-Id + X-Roomly-Webhook-Secret 헤더로 인증한다.
 */
async function postHandler(request: NextRequest) {
  const hotelId = request.headers.get('x-hotel-id')
  if (!hotelId) throw ApiError.badRequest('x-hotel-id 헤더가 필요합니다.', 'missing_headers')

  const service = createServiceClient()
  await verifyPmsSecret(service, hotelId, request.headers.get('x-roomly-webhook-secret'))

  const body = await request.json() as CloudbedsWebhookEvent
  const event = parseCloudbedsEvent(body)
  if (!event) return NextResponse.json({ ok: true, skipped: true })

  await applyPmsEvent(service, hotelId, event)

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
