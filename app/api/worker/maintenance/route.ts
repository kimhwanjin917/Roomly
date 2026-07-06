import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const session = cookieStore.get('roomly_worker_session')
  if (!session) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  let staffId: string, hotelId: string
  try {
    const { payload } = await jwtVerify(session.value, secret)
    const meta = (payload as { app_metadata?: { staff_id?: string; hotel_id?: string } }).app_metadata
    staffId = meta?.staff_id ?? ''
    hotelId = meta?.hotel_id ?? ''
    if (!staffId || !hotelId) throw new Error('missing claims')
  } catch {
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { roomId?: string; description: string; photoUrl?: string }

  const service = createServiceClient()
  const { data, error } = await service.from('maintenance_requests').insert({
    hotel_id: hotelId,
    room_id: body.roomId ?? null,
    staff_id: staffId,
    description: body.description,
    photo_url: body.photoUrl ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  return NextResponse.json(data)
}
