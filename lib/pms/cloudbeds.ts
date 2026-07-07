// Cloudbeds 웹훅 이벤트 → Roomly 내부 포맷 변환 (T-202)
import type { RoomlyWebhookPayload } from './mews'

export interface CloudbedsWebhookEvent {
  event: string // "reservation/checked_out", "reservation/checked_in" 등
  propertyID?: string
  reservationID?: string
  roomName?: string // Cloudbeds 객실명 (예: "101")
  roomID?: string
  startDate?: string
  endDate?: string
  estimatedArrivalTime?: string
}

// Cloudbeds roomID → Roomly room number 매핑 (미지정 시 roomName → roomID 순으로 사용)
export function convertCloudbedsEvent(
  event: CloudbedsWebhookEvent,
  roomMapping: Record<string, string> = {}
): RoomlyWebhookPayload | null {
  const roomNumber =
    (event.roomID && roomMapping[event.roomID]) ||
    event.roomName ||
    event.roomID
  if (!roomNumber) return null

  if (event.event === 'reservation/checked_out') {
    return { event: 'checkout', room_number: roomNumber }
  }

  if (event.event === 'reservation/checked_in' || event.event === 'reservation/created') {
    // 체크인 시각: 도착 예정 시간이 있으면 날짜와 조합, 없으면 startDate만 사용
    const checkinTime = event.startDate
      ? event.estimatedArrivalTime
        ? `${event.startDate}T${event.estimatedArrivalTime}`
        : event.startDate
      : undefined
    if (!checkinTime) return null
    const parsed = new Date(checkinTime)
    if (isNaN(parsed.getTime())) return null
    return { event: 'checkin_updated', room_number: roomNumber, checkin_time: parsed.toISOString() }
  }

  return null
}
