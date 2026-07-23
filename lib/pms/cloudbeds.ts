// Cloudbeds API 어댑터 (T-202)
// 참고: https://hotels.cloudbeds.com/api/v1.2

import type { PmsRoomEvent } from './mews'

type CloudbedsWebhook = {
  type: string
  reservation: {
    reservation_id: string
    checkout_date?: string
    checkin_date?: string
    status?: string
  }
}

export function parseCloudbedsEvent(body: CloudbedsWebhook): PmsRoomEvent | null {
  const res = body.reservation
  if (!res?.reservation_id) return null

  if (body.type === 'reservation.checkout') {
    return { externalRoomId: res.reservation_id, action: 'checkout' }
  }
  if (body.type === 'reservation.confirmed' && res.checkin_date) {
    return {
      externalRoomId: res.reservation_id,
      action: 'checkin',
      checkinTime: new Date(res.checkin_date).toISOString(),
    }
  }
  if (body.type === 'reservation.cancelled') {
    return { externalRoomId: res.reservation_id, action: 'cancel' }
  }
  return null
}

export function verifyCloudbedsSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const crypto = require('crypto')
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
