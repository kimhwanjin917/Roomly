import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/api-error'
import { PLAN_ROOM_LIMITS, DEFAULT_ROOM_LIMIT } from '@/lib/constants'

/**
 * 테넌트 격리 가드 — 요청한 리소스가 실제로 그 호텔 소유인지 서버에서 검증한다.
 * 라우트마다 흩어져 있던 "내 호텔 객실인지 확인" 쿼리의 단일 출처.
 */

export interface RoomRef {
  id: string
  number: string
  status: string
}

/**
 * 객실이 해당 호텔 소유인지 확인하고 반환. 아니면 403.
 * `statuses`를 주면 현재 상태가 목록에 없을 때 400을 던진다.
 */
export async function requireRoom(
  service: SupabaseClient,
  roomId: string,
  hotelId: string,
  statuses?: readonly string[],
): Promise<RoomRef> {
  const { data } = await service
    .from('rooms')
    .select('id, number, status')
    .eq('id', roomId)
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)
    .single()

  if (!data) throw ApiError.forbidden('해당 객실에 접근할 수 없습니다.')
  if (statuses && !statuses.includes(data.status)) {
    throw ApiError.badRequest('현재 상태에서는 변경할 수 없습니다.', 'invalid_status')
  }

  return data as RoomRef
}

export interface StaffRef {
  id: string
  name: string
  phone_number: string | null
  role: string
  qr_version: number
  auth_id: string
}

/** 직원이 해당 호텔 소속인지 확인하고 반환. 아니면 403. */
export async function requireStaff(
  service: SupabaseClient,
  staffId: string,
  hotelId: string,
): Promise<StaffRef> {
  const { data } = await service
    .from('staff')
    .select('id, name, phone_number, role, qr_version, auth_id')
    .eq('id', staffId)
    .eq('hotel_id', hotelId)
    .single()

  if (!data) throw ApiError.forbidden('해당 직원에 접근할 수 없습니다.')
  return data as StaffRef
}

/**
 * 객실 추가가 플랜 한도를 넘지 않는지 검증. 초과 시 403 + { limit, current, requested }.
 * 단건 등록과 일괄 등록이 같은 규칙을 공유한다.
 */
export async function assertRoomQuota(
  service: SupabaseClient,
  hotelId: string,
  requested: number,
): Promise<void> {
  const [{ data: hotel }, { count }] = await Promise.all([
    service.from('hotels').select('subscription_plan').eq('id', hotelId).single(),
    service
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .is('deleted_at', null),
  ])

  const plan = (hotel?.subscription_plan as string) ?? 'trial'
  const limit = PLAN_ROOM_LIMITS[plan] ?? DEFAULT_ROOM_LIMIT
  const current = count ?? 0

  if (current + requested > limit) {
    throw ApiError.forbidden(
      `객실 등록 한도(${limit}개)를 초과합니다.`,
      'room_limit_exceeded',
      { limit, current, requested },
    )
  }
}
