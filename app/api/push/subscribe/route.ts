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
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const service = createServiceClient()

  if (isAdmin) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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
    if (!staffId) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('roomly_worker_session')
    if (!sessionCookie) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    let jwtPayload: { app_metadata?: { staff_id?: string } }
    try {
      const { payload } = await jwtVerify(sessionCookie.value, secret)
      jwtPayload = payload as typeof jwtPayload
    } catch {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (jwtPayload.app_metadata?.staff_id !== staffId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
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
  const body = await request.json() as { endpoint: string; isAdmin?: boolean }
  const { endpoint, isAdmin } = body

  if (!endpoint) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()

  if (isAdmin) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    // 관리자: 자기 호텔 구독만 삭제 (hotel_id로 소유권 확인)
    const hotelId = user.app_metadata?.hotel_id as string | undefined
    if (!hotelId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    await service.from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('hotel_id', hotelId)
      .eq('is_admin', true)
  } else {
    // 직원: 본인 세션의 staff_id가 소유한 구독만 삭제
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('roomly_worker_session')
    if (!sessionCookie) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    let staffId: string | undefined
    try {
      const { payload } = await jwtVerify(sessionCookie.value, secret)
      staffId = (payload as { app_metadata?: { staff_id?: string } }).app_metadata?.staff_id
    } catch {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!staffId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    await service.from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('staff_id', staffId)
  }

  return NextResponse.json({ ok: true })
}
