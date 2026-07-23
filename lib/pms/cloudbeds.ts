// Cloudbeds API 어댑터 (T-202)
// 참고: https://hotels.cloudbeds.com/api/v1.2

import type { PmsRoomEvent } from './mews'

export type CloudbedsWebhookEvent = {
  type: string
  room_number?: string
  room?: { room_number?: string }
  reservation?: {
    reservation_id?: string
    checkout_date?: string
    checkin_date?: string
    status?: string
    rooms?: Array<{ room_number?: string }>
  }
}

/** Cloudbeds는 페이로드 형태에 따라 호수를 세 위치 중 하나에 담아 보낸다. */
function extractRoomNumber(body: CloudbedsWebhookEvent): string | null {
  return (
    body.room_number ??
    body.room?.room_number ??
    body.reservation?.rooms?.[0]?.room_number ??
    null
  )
}

/**
 * Cloudbeds 웹훅을 표준 PmsRoomEvent로 정규화한다.
 *
 * externalRoomId는 rooms.number와 매칭되므로 예약 ID가 아니라 반드시 호수여야 한다.
 * 처리 대상이 아닌 이벤트는 null을 반환한다.
 */
export function parseCloudbedsEvent(body: CloudbedsWebhookEvent): PmsRoomEvent | null {
  const externalRoomId = extractRoomNumber(body)
  if (!externalRoomId) return null

  switch (body.type) {
    case 'reservation.checkout':
      return { externalRoomId, action: 'checkout' }

    case 'reservation.confirmed':
    case 'reservation.checkin': {
      const checkinDate = body.reservation?.checkin_date
      if (!checkinDate) return null
      return {
        externalRoomId,
        action: 'checkin',
        checkinTime: new Date(checkinDate).toISOString(),
      }
    }

    case 'reservation.cancelled':
      return { externalRoomId, action: 'cancel' }

    default:
      return null
  }
}
