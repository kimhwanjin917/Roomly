import { NextRequest, NextResponse } from 'next/server'
import { requireWorker } from '@/lib/auth'
import { requireRoom } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'

/** done/inspect → dirty 전환만 허용 (체크아웃 방 더티 처리 전용) */
const TRANSITIONABLE_FROM = ['done', 'inspect'] as const

async function postHandler(request: NextRequest) {
  const { staffId, hotelId, service } = await requireWorker(request, 'dirty')

  const { roomId } = await request.json()
  if (!roomId) throw ApiError.badRequest('객실을 선택해주세요.')

  await requireRoom(service, roomId, hotelId, TRANSITIONABLE_FROM)

  await service.from('rooms').update({ status: 'dirty' }).eq('id', roomId)
  await service.from('room_logs').insert({
    room_id: roomId,
    status: 'dirty',
    changed_by: staffId,
    memo: null,
  })

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
