import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    subscription: {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }
    staffId?: string
    isAdmin?: boolean
    hotelId: string
  }

  const { subscription, staffId, isAdmin, hotelId } = body

  if (!subscription?.endpoint || !hotelId) {
    return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })
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
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
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
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'endpoint' }
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json() as { endpoint: string }
  const { endpoint } = body

  if (!endpoint) return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()
  await service.from('push_subscriptions').delete().eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
