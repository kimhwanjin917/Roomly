import { NextRequest, NextResponse } from 'next/server'
import { requireWorker } from '@/lib/auth'
import { requireRoom } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'

/** 직원 비품 요청 (T-121) */
async function postHandler(request: NextRequest) {
  const { staffId, hotelId, service } = await requireWorker(request)

  const { roomId, note, qty } = await request.json()
  if (!note?.trim()) throw ApiError.badRequest('요청 내용을 입력해주세요.')

  if (roomId) await requireRoom(service, roomId, hotelId)

  const { error } = await service.from('supply_requests').insert({
    hotel_id: hotelId,
    staff_id: staffId,
    room_id: roomId ?? null,
    supply_id: null,
    note: note.trim(),
    qty: Number(qty) > 0 ? Number(qty) : 1,
    status: 'pending',
  })

  if (error) {
    console.error('[worker/supply-request POST]', error)
    throw ApiError.internal()
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export const POST = withApiError(postHandler)
