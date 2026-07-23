import type { SupabaseClient } from '@supabase/supabase-js'
import { kstDateStr, kstDayRange } from '@/lib/date'

/**
 * 일일 근무자 청소 목록의 단일 출처 — 서버 페이지와 /api/guest/assignments가 공유한다.
 *
 * 아직 안 끝난 배정 + 오늘 완료한 배정을 함께 돌려준다. 완료 건까지 담아야
 * 화면에서 "완료"로 바뀌는 게 보이고 진행률(n/N)이 맞는다.
 */
export async function fetchGuestAssignments(
  service: SupabaseClient,
  hotelId: string,
) {
  // or() 안의 값은 쿼리스트링으로 실려가므로 "+09:00"의 +가 공백으로 디코딩된다.
  // 오프셋 없는 UTC(Z) 형태로 넘겨야 한다.
  const start = new Date(kstDayRange(kstDateStr()).start).toISOString()

  const { data } = await service
    .from('assignments')
    .select('id, assigned_at, completed_at, rooms!inner(id, number, floor, type, status, checkin_time, hotel_id, deleted_at)')
    .eq('rooms.hotel_id', hotelId)
    .is('rooms.deleted_at', null)
    .eq('is_guest', true)
    .is('cancelled_at', null)
    .or(`completed_at.is.null,completed_at.gte.${start}`)

  return data ?? []
}
