import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'

/** 한 번에 체크아웃시킬 객실 수 */
const BATCH = 3

/** 체크인까지 남길 시간(분) — ALERT_MINUTES(120)보다 짧게 잡아야 urgent로 뜬다 */
const CHECKIN_IN_MINUTES = 90

/**
 * 체크아웃 발생 시뮬레이션 — 완료된 객실 몇 개를 더티로 되돌리고
 * 체크인 시각을 가까이 당긴다. 에이전트에게 처리할 일을 만들어주는 용도.
 *
 * 실제 운영에서는 PMS 웹훅(api/pms/webhook)이 이 일을 한다.
 * 이 라우트는 PMS 없이 에이전트가 반응하는 걸 확인할 때 쓴다.
 */
async function postHandler() {
  const { hotelId, service } = await requireAdmin()

  const { data: rooms } = await service
    .from('rooms')
    .select('id, number')
    .eq('hotel_id', hotelId)
    .in('status', ['done', 'inspect'])
    .is('deleted_at', null)
    .limit(BATCH)

  if (!rooms?.length) {
    return NextResponse.json({ checkedOut: [], note: '체크아웃시킬 완료 객실이 없습니다.' })
  }

  const checkinTime = new Date(Date.now() + CHECKIN_IN_MINUTES * 60_000).toISOString()
  const ids = rooms.map(r => r.id)

  const { error } = await service
    .from('rooms')
    .update({ status: 'dirty', checkin_time: checkinTime })
    .in('id', ids)
  if (error) {
    console.error('[agent/simulate]', error)
    return NextResponse.json({ checkedOut: [], note: '체크아웃 처리에 실패했습니다.' }, { status: 500 })
  }

  await service.from('room_logs').insert(
    ids.map(id => ({ room_id: id, status: 'dirty', changed_by: 'admin', memo: '체크아웃 (시뮬레이션)' })),
  )

  return NextResponse.json({ checkedOut: rooms.map(r => r.number), checkinTime })
}

export const POST = withApiError(postHandler)
