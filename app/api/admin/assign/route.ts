import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { requireRoom } from '@/lib/guards'
import { sendPushToStaff } from '@/lib/push'
import { ApiError, withApiError } from '@/lib/api-error'

async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()
  const { roomId, staffId, isGuest, unassign } = await request.json()

  if (!roomId) throw ApiError.badRequest('객실을 선택해주세요.')

  const room = await requireRoom(service, roomId, hotelId)

  // 기존 활성 배정 취소
  await service
    .from('assignments')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .is('completed_at', null)
    .is('cancelled_at', null)

  // 미배정(unassign)이면 취소만 하고 종료
  if (unassign || (!staffId && !isGuest)) {
    return NextResponse.json({ ok: true })
  }

  const { data: assignment, error } = await service
    .from('assignments')
    .insert({ room_id: roomId, staff_id: staffId ?? null, is_guest: isGuest ?? false })
    .select('id')
    .single()

  if (error) {
    console.error('[admin/assign POST]', error)
    throw ApiError.internal()
  }

  if (staffId) {
    // 푸시 실패가 배정을 막지 않도록 비차단 발송
    sendPushToStaff(staffId, {
      title: `${room.number}호 배정됨`,
      body: '청소를 시작해주세요',
      url: `/worker/${staffId}`,
      tag: `assign-${staffId}`,
    }).catch(() => {})
  }

  return NextResponse.json({ assignmentId: assignment.id })
}

export const POST = withApiError(postHandler)
