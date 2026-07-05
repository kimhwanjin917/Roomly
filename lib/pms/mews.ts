// Mews ReservationUpdated 이벤트 → Roomly 내부 포맷 변환
export interface MewsReservationEvent {
  Type: string // "ReservationUpdated"
  Value: {
    Id: string
    State: string // "Checked_out", "Checked_in" 등
    ResourceId: string // Mews room ID
    StartUtc?: string
    EndUtc?: string
  }
}

export interface RoomlyWebhookPayload {
  event: 'checkout' | 'checkin_updated'
  room_number: string
  checkin_time?: string
}

// Mews ResourceId → Roomly room number 매핑 (관리자 설정에서 관리)
// 현재는 ResourceId를 직접 room_number로 사용 (단순 매핑)
export function convertMewsEvent(
  event: MewsReservationEvent,
  resourceMapping: Record<string, string> = {}
): RoomlyWebhookPayload | null {
  const roomNumber = resourceMapping[event.Value.ResourceId] ?? event.Value.ResourceId

  if (event.Value.State === 'Checked_out') {
    return { event: 'checkout', room_number: roomNumber }
  }

  if (event.Value.State === 'Checked_in' && event.Value.StartUtc) {
    return { event: 'checkin_updated', room_number: roomNumber, checkin_time: event.Value.StartUtc }
  }

  return null
}
