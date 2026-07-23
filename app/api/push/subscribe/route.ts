import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

async function postHandler(request: NextRequest) {
  const body = await request.json() as {
    subscription?: {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }
    // T-205: 네이티브 앱(Capacitor)은 Web Push 구독 대신 FCM 토큰을 보낸다
    fcmToken?: string
    staffId?: string
    isAdmin?: boolean
    hotelId: string
  }

  const { subscription, fcmToken, staffId, isAdmin, hotelId } = body

  if ((!subscription?.endpoint && !fcmToken) || !hotelId) {
    return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })
  }

  // FCM 구독은 endpoint에 'fcm:{token}'을 저장해 UNIQUE(endpoint) 중복 방지를 재사용
  const subscriptionFields = fcmToken
    ? { endpoint: `fcm:${fcmToken}`, p256dh: null, auth: null, platform: 'fcm', fcm_token: fcmToken }
    : {
        endpoint: subscription!.endpoint,
        p256dh: subscription!.keys.p256dh,
        auth: subscription!.keys.auth,
        platform: 'web',
        fcm_token: null,
      }

  const service = createServiceClient()

  if (isAdmin) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

    await service.from('push_subscriptions').upsert(
      {
        hotel_id: hotelId,
        staff_id: null,
        is_admin: true,
        ...subscriptionFields,
      },
      { onConflict: 'endpoint' }
    )
  } else {
    if (!staffId) return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })

    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('roomly_worker_session')
    if (!sessionCookie) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    let jwtPayload: { app_metadata?: { staff_id?: string } }
    try {
      const { payload } = await jwtVerify(sessionCookie.value, secret)
      jwtPayload = payload as typeof jwtPayload
    } catch {
      return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
    }

    if (jwtPayload.app_metadata?.staff_id !== staffId) {
      return NextResponse.json({ error: 'forbidden', code: 'forbidden' }, { status: 403 })
    }

    await service.from('push_subscriptions').upsert(
      {
        hotel_id: hotelId,
        staff_id: staffId,
        is_admin: false,
        ...subscriptionFields,
      },
      { onConflict: 'endpoint' }
    )
  }

  return NextResponse.json({ ok: true })
}

async function deleteHandler(request: NextRequest) {
  const body = await request.json() as { endpoint?: string; fcmToken?: string }
  const endpoint = body.endpoint ?? (body.fcmToken ? `fcm:${body.fcmToken}` : null)

  if (!endpoint) return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()
  await service.from('push_subscriptions').delete().eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
export const DELETE = withApiError(deleteHandler)
