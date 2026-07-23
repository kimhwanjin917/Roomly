import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { nextKstMidnight } from '@/lib/date'

/**
 * 일일 근무자 접속 코드.
 *
 * 발급/재발급은 "세대 교체"다. 기존 코드 행을 지우고 새 행(새 id)을 만들면
 *   · 그 id를 물고 있던 게스트 세션 JWT는 즉시 무효가 되고 (lib/auth requireGuest)
 *   · 이전 세대로 가입한 일용직(temp) 기록은 모두 삭제되어
 *   · 새 QR을 스캔한 사람은 처음부터 다시 가입한다.
 */

async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  const { data } = await service
    .from('guest_codes')
    .select('id, code, expires_at')
    .eq('hotel_id', hotelId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!data) return NextResponse.json(null)
  return NextResponse.json({ id: data.id, code: data.code, expiresAt: data.expires_at })
}

async function postHandler() {
  const { hotelId, service } = await requireAdmin()

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = nextKstMidnight()
  const today = new Date().toISOString().slice(0, 10)

  // 1) 이 호텔의 일용직 기록 전부 삭제 (push_subscriptions는 CASCADE로 함께 정리)
  //    작업 이력(room_logs.changed_by)은 FK가 없는 TEXT라 그대로 남는다.
  await service.from('staff').delete().eq('hotel_id', hotelId).eq('employment_type', 'temp')

  // 2) 기존 코드 행 삭제 후 재삽입 — 새 id가 곧 새 세대가 된다.
  //    (upsert는 id를 유지해 옛 세션이 살아남으므로 쓰지 않는다)
  await service.from('guest_codes').delete().eq('hotel_id', hotelId)

  const { data, error } = await service
    .from('guest_codes')
    .insert({ hotel_id: hotelId, code, date: today, expires_at: expiresAt.toISOString() })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[admin/guest-code POST]', error)
    throw new Error('코드 발급에 실패했습니다.')
  }

  return NextResponse.json({ id: data.id, code, expiresAt: expiresAt.toISOString() })
}

export const GET = withApiError(getHandler)
export const POST = withApiError(postHandler)
