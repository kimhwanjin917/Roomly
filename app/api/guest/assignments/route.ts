import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('roomly_guest_session')
  if (!sessionCookie) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(sessionCookie.value, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const hotelId = payload.app_metadata?.hotel_id as string
  const service = createServiceClient()

  const { data: hotelRooms } = await service
    .from('rooms')
    .select('id')
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)

  const roomIds = (hotelRooms ?? []).map((r: { id: string }) => r.id)
  if (roomIds.length === 0) return NextResponse.json([])

  const { data } = await service
    .from('assignments')
    .select('id, assigned_at, rooms(id, number, floor, type, status, checkin_time)')
    .eq('is_guest', true)
    .is('completed_at', null)
    .is('cancelled_at', null)
    .in('room_id', roomIds)

  return NextResponse.json(data ?? [])
}
