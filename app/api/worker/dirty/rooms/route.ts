import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('roomly_worker_session')
  if (!sessionCookie) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(sessionCookie.value, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (payload.app_metadata?.worker_role !== 'dirty') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const hotelId = payload.app_metadata?.hotel_id as string
  const service = createServiceClient()

  const { data } = await service
    .from('rooms')
    .select('id, number, floor, type, status, checkin_time')
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)
    .order('floor')
    .order('number')

  return NextResponse.json(data ?? [])
}
