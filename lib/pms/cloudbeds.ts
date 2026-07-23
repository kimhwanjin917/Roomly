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

type ConvertedEvent = {
  event: 'checkout' | 'checkin_updated'
  room_number: string
  checkin_time?: string
} | null

export function convertCloudbedsEvent(body: CloudbedsWebhookEvent): ConvertedEvent {
  const roomNumber =
    body.room_number ??
    body.room?.room_number ??
    body.reservation?.rooms?.[0]?.room_number

  if (!roomNumber) return null

  if (body.type === 'reservation.checkout') {
    return { event: 'checkout', room_number: roomNumber }
  }
  if (
    (body.type === 'reservation.confirmed' || body.type === 'reservation.checkin') &&
    body.reservation?.checkin_date
  ) {
    return {
      event: 'checkin_updated',
      room_number: roomNumber,
      checkin_time: new Date(body.reservation.checkin_date).toISOString(),
    }
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
