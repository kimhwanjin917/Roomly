import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { startNumber, endNumber, floor, type } = await request.json()

  const start = parseInt(String(startNumber))
  const end = parseInt(String(endNumber))

  if (isNaN(start) || isNaN(end) || !floor) {
    return NextResponse.json({ error: '시작 호수, 끝 호수, 층을 모두 입력해 주세요.' }, { status: 400 })
  }
  if (start > end) {
    return NextResponse.json({ error: '시작 호수가 끝 호수보다 클 수 없습니다.' }, { status: 400 })
  }
  if (end - start >= 100) {
    return NextResponse.json({ error: '한 번에 최대 100개까지 등록할 수 있습니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  const ROOM_LIMITS: Record<string, number> = { trial: 50, starter: 50, standard: 150, pro: 9999 }

  const [{ data: hotel }, { count: currentCount }] = await Promise.all([
    service.from('hotels').select('subscription_plan').eq('id', hotelId).single(),
    service.from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId).is('deleted_at', null),
  ])

  const limit = ROOM_LIMITS[hotel?.subscription_plan ?? 'trial'] ?? 50
  const newCount = end - start + 1

  if ((currentCount ?? 0) + newCount > limit) {
    return NextResponse.json({
      error: 'room_limit_exceeded',
      limit,
      current: currentCount ?? 0,
      requested: newCount,
    }, { status: 403 })
  }

  const rooms = Array.from({ length: newCount }, (_, i) => ({
    hotel_id: hotelId,
    number: String(start + i),
    floor: Number(floor),
    type: type ?? 'double',
  }))

  const { data, error } = await service
    .from('rooms')
    .insert(rooms)
    .select('id, number, floor, type')

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 호수가 포함되어 있습니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'server_error', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ created: data?.length ?? 0, rooms: data })
}
