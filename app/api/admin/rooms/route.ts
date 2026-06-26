import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { number, floor, type } = await request.json()
  if (!number?.trim() || !floor) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()

  const ROOM_LIMITS: Record<string, number> = { trial: 50, starter: 50, standard: 150, pro: 9999 }

  const [{ data: hotel }, { count: currentCount }] = await Promise.all([
    service.from('hotels').select('subscription_plan').eq('id', hotelId).single(),
    service.from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId).is('deleted_at', null),
  ])

  const limit = ROOM_LIMITS[hotel?.subscription_plan ?? 'trial'] ?? 50
  if ((currentCount ?? 0) >= limit) {
    return NextResponse.json({ error: 'room_limit_exceeded', limit }, { status: 403 })
  }

  const { data, error } = await service
    .from('rooms')
    .insert({ hotel_id: hotelId, number: number.trim(), floor: Number(floor), type })
    .select('id, number, floor, type')
    .single()

  if (error) {
    console.error('[rooms POST]', error)
    if (error.code === '23505') return NextResponse.json({ error: 'duplicate' }, { status: 409 })
    return NextResponse.json({ error: 'server_error', detail: error.message, code: error.code }, { status: 500 })
  }

  return NextResponse.json(data)
}
