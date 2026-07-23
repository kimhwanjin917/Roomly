import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { askClaudeJson, aiEnabled } from '@/lib/ai'

interface Recommendation {
  roomId: string
  staffId: string
  reason: string
}

async function postHandler() {
  const { hotelId, service } = await requireAdmin()

  if (!aiEnabled()) {
    throw ApiError.unavailable('AI 기능이 설정되지 않았습니다. (ANTHROPIC_API_KEY)', 'ai_disabled')
  }

  const [{ data: rooms }, { data: staff }, { data: assignments }] = await Promise.all([
    service
      .from('rooms')
      .select('id, number, floor, type, status, checkin_time')
      .eq('hotel_id', hotelId)
      .eq('status', 'dirty')
      .is('deleted_at', null),
    service.from('staff').select('id, name, role').eq('hotel_id', hotelId),
    // 활성 배정은 내 호텔 객실에 한정 (rooms 조인으로 테넌트 격리)
    service
      .from('assignments')
      .select('room_id, rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotelId)
      .is('completed_at', null)
      .is('cancelled_at', null),
  ])

  if (!rooms?.length) return NextResponse.json({ recommendations: [] })

  const assignedRoomIds = new Set((assignments ?? []).map(a => a.room_id))
  const unassigned = rooms.filter(r => !assignedRoomIds.has(r.id))

  if (!unassigned.length) {
    return NextResponse.json({ recommendations: [], message: '배정 대상 객실이 없습니다.' })
  }
  if (!staff?.length) {
    return NextResponse.json({ recommendations: [], message: '배정할 직원이 없습니다.' })
  }

  const parsed = await askClaudeJson<{ recommendations?: Recommendation[] }>(
    `호텔 하우스키핑 배정을 최적화해주세요. JSON으로만 응답.

미배정 객실: ${JSON.stringify(unassigned.map(r => ({ id: r.id, number: r.number, floor: r.floor, checkin: r.checkin_time })))}
직원 목록: ${JSON.stringify(staff.map(s => ({ id: s.id, name: s.name, role: s.role })))}

응답 형식: {"recommendations": [{"roomId": "...", "staffId": "...", "reason": "한 줄 이유"}]}
체크인이 빠른 방 우선, 같은 층 직원 우선 배정.`,
  )

  // 모델이 존재하지 않는 ID를 지어낼 수 있으므로 실제 객실/직원만 통과시킨다
  const roomIds = new Set(unassigned.map(r => r.id))
  const staffIds = new Set(staff.map(s => s.id))
  const recommendations = (parsed?.recommendations ?? []).filter(
    r => roomIds.has(r.roomId) && staffIds.has(r.staffId),
  )

  return NextResponse.json({ recommendations })
}

export const POST = withApiError(postHandler)
