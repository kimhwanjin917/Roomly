// Mews Connector API 어댑터 (T-111)
// 참고: https://mews-systems.gitbook.io/connector-api

export type PmsRoomEvent = {
  externalRoomId: string
  action: 'checkout' | 'checkin' | 'cancel'
  checkinTime?: string
}

type MewsReservationUpdate = {
  Reservation: {
    Id: string
    State: string
    StartUtc?: string
    EndUtc?: string
  }
}

export function parseMewsEvent(body: MewsReservationUpdate): PmsRoomEvent | null {
  const res = body.Reservation
  if (!res?.Id) return null

  if (res.State === 'CheckedOut' || res.State === 'Checked_Out') {
    return { externalRoomId: res.Id, action: 'checkout' }
  }
  if (res.State === 'Confirmed' && res.StartUtc) {
    return { externalRoomId: res.Id, action: 'checkin', checkinTime: res.StartUtc }
  }
  if (res.State === 'Canceled' || res.State === 'Cancelled') {
    return { externalRoomId: res.Id, action: 'cancel' }
  }
  return null
}
