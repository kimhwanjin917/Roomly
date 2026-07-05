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

  const hotelId = payload.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data } = await service
    .from('supplies')
    .select('id, name, unit')
    .eq('hotel_id', hotelId)
    .order('name')

  return NextResponse.json(data ?? [])
}
