import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 리포트 집계 — 일일/주간/온보딩 D7 크론이 공유하는 배정 통계 로직.
 */

export interface StaffStat {
  name: string
  completed: number
  /** 배정 → 완료까지 평균 소요 분. 계산 불가 시 null */
  avgMinutes: number | null
}

/** assignments 조회 시 사용할 select 절 — staff 이름과 hotel 필터용 조인 포함 */
export const COMPLETED_ASSIGNMENT_SELECT =
  'staff_id, assigned_at, completed_at, staff:staff_id(name), rooms!inner(hotel_id)'

export interface CompletedAssignment {
  staff_id: string | null
  assigned_at: string | null
  completed_at: string | null
  staff?: { name: string } | { name: string }[] | null
}

function staffName(row: CompletedAssignment): string {
  const s = row.staff
  if (!s) return '게스트'
  return (Array.isArray(s) ? s[0]?.name : s.name) ?? '게스트'
}

/** 완료 배정 목록을 직원별 실적으로 집계한다 (완료 건수 내림차순). */
export function aggregateStaffStats(assignments: CompletedAssignment[]): StaffStat[] {
  const byStaff = new Map<string, { name: string; count: number; totalMinutes: number }>()

  for (const a of assignments) {
    const key = a.staff_id ?? 'guest'
    let entry = byStaff.get(key)
    if (!entry) {
      entry = { name: staffName(a), count: 0, totalMinutes: 0 }
      byStaff.set(key, entry)
    }
    entry.count++
    if (a.completed_at && a.assigned_at) {
      entry.totalMinutes +=
        (new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / 60_000
    }
  }

  return Array.from(byStaff.values())
    .sort((a, b) => b.count - a.count)
    .map(s => ({
      name: s.name,
      completed: s.count,
      avgMinutes: s.count > 0 ? Math.round(s.totalMinutes / s.count) : null,
    }))
}

/** 전체 배정의 평균 소요 분 (건수 가중 평균) */
export function overallAvgMinutes(stats: StaffStat[]): number | null {
  const counted = stats.filter(s => s.avgMinutes !== null)
  const total = counted.reduce((sum, s) => sum + s.completed, 0)
  if (total === 0) return null
  const weighted = counted.reduce((sum, s) => sum + (s.avgMinutes as number) * s.completed, 0)
  return Math.round(weighted / total)
}

/** 평균 소요 시간이 가장 짧은 직원 이름 */
export function fastestStaff(stats: StaffStat[]): string | null {
  const ranked = stats
    .filter(s => s.avgMinutes !== null)
    .sort((a, b) => (a.avgMinutes as number) - (b.avgMinutes as number))
  return ranked[0]?.name ?? null
}

/** 호텔의 삭제되지 않은 객실 수 */
export async function countRooms(service: SupabaseClient, hotelId: string): Promise<number> {
  const { count } = await service
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)
  return count ?? 0
}

/** 기간 내 완료된 배정 조회 (호텔 단위) */
export async function fetchCompletedAssignments(
  service: SupabaseClient,
  hotelId: string,
  range: { from: string; to?: string },
): Promise<CompletedAssignment[]> {
  let query = service
    .from('assignments')
    .select(COMPLETED_ASSIGNMENT_SELECT)
    .eq('rooms.hotel_id', hotelId)
    .not('completed_at', 'is', null)
    .gte('completed_at', range.from)

  if (range.to) query = query.lt('completed_at', range.to)

  const { data } = await query
  return (data ?? []) as unknown as CompletedAssignment[]
}
