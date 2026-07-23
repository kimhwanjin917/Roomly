import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ApiError, withApiError } from '@/lib/api-error'
import { kstDateStr, kstDayRange } from '@/lib/date'

export const dynamic = 'force-dynamic'

export type OrgHotelStat = {
  hotelId: string
  name: string
  totalRooms: number
  completedToday: number
  /** 0~100 */
  completionRate: number
  /** done/inspect가 아닌 객실 수 (stats 페이지와 동일 기준) */
  incompleteCount: number
  cleaningCount: number
}

interface HotelTally {
  total: number
  incomplete: number
  cleaning: number
  completed: number
}

/** 체인 법인(org) 관리자 전용 — 산하 호텔 현황 요약 */
async function getHandler() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw ApiError.unauthorized()

  const role = user.app_metadata?.role as string | undefined
  const orgId = user.app_metadata?.org_id as string | undefined
  if (role !== 'org_admin' || !orgId) throw ApiError.forbidden()

  const service = createServiceClient()

  const { data: hotels, error: hotelsErr } = await service
    .from('hotels')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name')

  if (hotelsErr) {
    console.error('[org/hotels]', hotelsErr)
    throw ApiError.internal()
  }
  if (!hotels?.length) return NextResponse.json({ hotels: [] })

  const hotelIds = hotels.map(h => h.id)
  const date = kstDateStr()
  const { start, end } = kstDayRange(date)

  const [roomsRes, completedRes] = await Promise.all([
    service.from('rooms').select('hotel_id, status').in('hotel_id', hotelIds).is('deleted_at', null),
    service
      .from('assignments')
      .select('rooms!inner(hotel_id)')
      .in('rooms.hotel_id', hotelIds)
      .not('completed_at', 'is', null)
      .gte('completed_at', start)
      .lte('completed_at', end),
  ])

  if (roomsRes.error || completedRes.error) {
    console.error('[org/hotels]', roomsRes.error ?? completedRes.error)
    throw ApiError.internal()
  }

  const tally = new Map<string, HotelTally>(
    hotels.map(h => [h.id, { total: 0, incomplete: 0, cleaning: 0, completed: 0 }]),
  )

  for (const room of roomsRes.data ?? []) {
    const stat = tally.get(room.hotel_id as string)
    if (!stat) continue
    stat.total++
    if (room.status !== 'done' && room.status !== 'inspect') stat.incomplete++
    if (room.status === 'cleaning') stat.cleaning++
  }

  for (const assignment of completedRes.data ?? []) {
    const hotelId = (assignment.rooms as unknown as { hotel_id?: string } | null)?.hotel_id
    const stat = hotelId ? tally.get(hotelId) : undefined
    if (stat) stat.completed++
  }

  const result: OrgHotelStat[] = hotels.map(h => {
    const s = tally.get(h.id)!
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
