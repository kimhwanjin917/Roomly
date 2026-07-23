import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireWorker } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'

interface SubscribeBody {
  subscription?: { endpoint: string; keys: { p256dh: string; auth: string } }
  /** T-205: 네이티브 앱(Capacitor)은 Web Push 구독 대신 FCM 토큰을 보낸다 */
  fcmToken?: string
  staffId?: string
  isAdmin?: boolean
  hotelId?: string
}

/**
 * FCM 구독은 endpoint에 'fcm:{token}'을 저장한다 —
 * UNIQUE(endpoint) 제약을 그대로 재사용해 중복 구독을 막는다.
 */
function subscriptionFields(body: SubscribeBody) {
  if (body.fcmToken) {
    return {
      endpoint: `fcm:${body.fcmToken}`,
      p256dh: null,
      auth: null,
      platform: 'fcm',
      fcm_token: body.fcmToken,
    }
  }
  const sub = body.subscription!
  return {
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    platform: 'web',
    fcm_token: null,
  }
}

async function postHandler(request: NextRequest) {
  const body = await request.json() as SubscribeBody

  if (!body.subscription?.endpoint && !body.fcmToken) {
    throw ApiError.badRequest('구독 정보가 필요합니다.')
  }

  const fields = subscriptionFields(body)

  // hotelId/staffId는 요청 본문이 아니라 세션에서 결정한다 (타 호텔 구독 등록 차단)
  if (body.isAdmin) {
    const { hotelId, service } = await requireAdmin()
    await service.from('push_subscriptions').upsert(
      { hotel_id: hotelId, staff_id: null, is_admin: true, ...fields },
      { onConflict: 'endpoint' },
    )
  } else {
    const { staffId, hotelId, service } = await requireWorker(request)
    // 클라이언트가 다른 직원 ID를 보냈다면 거부
    if (body.staffId && body.staffId !== staffId) throw ApiError.forbidden()

    await service.from('push_subscriptions').upsert(
      { hotel_id: hotelId, staff_id: staffId, is_admin: false, ...fields },
      { onConflict: 'endpoint' },
    )
  }

  return NextResponse.json({ ok: true })
}

async function deleteHandler(request: NextRequest) {
  const body = await request.json() as { endpoint?: string; fcmToken?: string }
  const endpoint = body.endpoint ?? (body.fcmToken ? `fcm:${body.fcmToken}` : null)
  if (!endpoint) throw ApiError.badRequest('구독 정보가 필요합니다.')

  // 워커 세션 또는 관리자 세션 중 하나는 있어야 한다
  let service
  try {
    ({ service } = await requireWorker(request))
  } catch {
    ({ service } = await requireAdmin())
  }

  await service.from('push_subscriptions').delete().eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
export const DELETE = withApiError(deleteHandler)
