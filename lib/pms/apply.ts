import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/api-error'
import type { PmsRoomEvent } from './mews'

/**
 * PMS 이벤트를 객실 상태에 반영하는 공통 처리기.
 *
 * 어댑터(mews / cloudbeds / generic)는 각자의 페이로드를 PmsRoomEvent로 정규화한 뒤
 * 이 함수를 호출한다. 예전에는 Mews 어댑터가 자기 자신의 웹훅 엔드포인트를 HTTP로
 * 다시 호출했는데, 불필요한 왕복과 URL/시크릿 설정 의존을 없앴다.
 *
 * externalRoomId는 rooms.number에 매핑된다고 가정한다.
 */
export async function applyPmsEvent(
  service: SupabaseClient,
  hotelId: string,
  event: PmsRoomEvent,
): Promise<void> {
  const { data: room } = await service
    .from('rooms')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('number', event.externalRoomId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!room) {
    throw ApiError.notFound(`객실을 찾을 수 없습니다: ${event.externalRoomId}`, 'room_not_found')
  }

  const update =
    event.action === 'checkout' ? { status: 'dirty', checkin_time: null }
    : event.action === 'checkin' && event.checkinTime ? { checkin_time: event.checkinTime }
    : event.action === 'cancel' ? { checkin_time: null }
    : null

  if (!update) return

  await service.from('rooms').update(update).eq('id', room.id)
}

/**
 * 호텔별 웹훅 시크릿 검증.
 * hotels.webhook_secret이 설정돼 있으면 그것을, 없으면 전역 PMS_WEBHOOK_SECRET을 쓴다.
 */
export async function verifyPmsSecret(
  service: SupabaseClient,
  hotelId: string,
  provided: string | null,
): Promise<void> {
  if (!provided) throw ApiError.unauthorized('웹훅 시크릿이 필요합니다.', 'missing_secret')

  const { data: hotel } = await service
    .from('hotels')
    .select('webhook_secret')
    .eq('id', hotelId)
    .maybeSingle()

  if (!hotel) throw ApiError.unauthorized('호텔을 찾을 수 없습니다.', 'unauthorized')

  const expected = (hotel.webhook_secret as string | null) ?? process.env.PMS_WEBHOOK_SECRET
  if (!expected || provided !== expected) {
    throw ApiError.unauthorized('웹훅 시크릿이 올바르지 않습니다.', 'unauthorized')
  }
}
