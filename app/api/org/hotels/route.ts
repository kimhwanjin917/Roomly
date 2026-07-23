import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

export type OrgHotelStat = {
  hotelId: string
  name: string
  totalRooms: number
  completedToday: number
  completionRate: number  // 0~100
  incompleteCount: number // done/inspect가 아닌 객실 수 (stats 페이지와 동일 기준)
  cleaningCount: number   // status = 'cleaning'
}

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function todayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

async function getHandler() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const role = user.app_metadata?.role as string | undefined
  const orgId = user.app_metadata?.org_id as string | undefined
  if (role !== 'org_admin' || !orgId) {
    return NextResponse.json({ error: 'forbidden', code: 'forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  const { data: hotels, error: hotelsErr } = await service
    .from('hotels')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name')

  if (hotelsErr) {
    return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }
  if (!hotels || hotels.length === 0) {
    return NextResponse.json({ hotels: [] })
  }

  const hotelIds = hotels.map(h => h.id)
  const date = todayKST()

  const [roomsRes, completedRes] = await Promise.all([
    service
      .from('rooms')
      .select('hotel_id, status')
      .in('hotel_id', hotelIds)
      .is('deleted_at', null),
    service
      .from('assignments')
      .select('rooms!inner(hotel_id)')
      .in('rooms.hotel_id', hotelIds)
      .gte('completed_at', `${date}T00:00:00+09:00`)
      .lte('completed_at', `${date}T23:59:59+09:00`)
      .not('completed_at', 'is', null),
  ])

  if (roomsRes.error || completedRes.error) {
    return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }

  const statMap: Record<string, { total: number; incomplete: number; cleaning: number; completed: number }> = {}
  for (const h of hotels) statMap[h.id] = { total: 0, incomplete: 0, cleaning: 0, completed: 0 }

  for (const r of roomsRes.data ?? []) {
    const s = statMap[r.hotel_id as string]
    if (!s) continue
    s.total++
    if (r.status !== 'done' && r.status !== 'inspect') s.incomplete++
    if (r.status === 'cleaning') s.cleaning++
  }

  for (const a of completedRes.data ?? []) {
    const hid = (a.rooms as any)?.hotel_id as string | undefined
    if (hid && statMap[hid]) statMap[hid].completed++
  }

  const result: OrgHotelStat[] = hotels.map(h => {
    const s = statMap[h.id]
    return {
      hotelId: h.id,
      name: h.name,
      totalRooms: s.total,
      completedToday: s.completed,
      completionRate: s.total > 0 ? Math.min(100, Math.round((s.completed / s.total) * 100)) : 0,
      incompleteCount: s.incomplete,
      cleaningCount: s.cleaning,
    }
  })

  return NextResponse.json({ hotels: result, date })
}

export const GET = withApiError(getHandler)
