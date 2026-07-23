import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ApiError, withApiError } from '@/lib/api-error'
import { parseMewsEvent } from '@/lib/pms/mews'
import { applyPmsEvent, verifyPmsSecret } from '@/lib/pms/apply'

/** Mews Connector API 수신 엔드포인트 (T-111) */
async function postHandler(request: NextRequest) {
  const hotelId = request.headers.get('x-hotel-id')
  if (!hotelId) throw ApiError.badRequest('x-hotel-id 헤더가 필요합니다.', 'missing_headers')

  const service = createServiceClient()
  await verifyPmsSecret(service, hotelId, request.headers.get('x-roomly-webhook-secret'))

  const event = parseMewsEvent(await request.json())
  if (!event) return NextResponse.json({ ok: true, skipped: true })

  await applyPmsEvent(service, hotelId, event)

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
