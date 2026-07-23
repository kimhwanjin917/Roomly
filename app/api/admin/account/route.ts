import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'

/**
 * 계정 탈퇴 (T-182)
 * 비밀번호 재확인 후 호텔 데이터 전체 삭제 + Supabase Auth 계정 삭제.
 * payment_logs는 전자상거래법 거래기록 보존 의무에 따라 호텔 연결만 끊고 보존한다.
 */
async function deleteHandler(request: NextRequest) {
  const { userId, email, hotelId, supabase, service } = await requireAdmin()

  const { password } = await request.json() as { password?: string }
  if (!password) throw ApiError.badRequest('비밀번호를 입력해주세요.', 'password_required')
  if (!email) throw ApiError.badRequest('이메일이 없는 계정은 탈퇴할 수 없습니다.', 'no_email')

  // 비밀번호 재확인 — 현재 세션 쿠키를 건드리지 않는 임시 클라이언트를 쓴다
  const verifier = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
  const { error: pwError } = await verifier.auth.signInWithPassword({ email, password })
  if (pwError) throw ApiError.forbidden('비밀번호가 일치하지 않습니다.', 'invalid_password')

  // 1. assignments 먼저 삭제 — staff FK가 ON DELETE RESTRICT라 hotels 캐스케이드가 막힌다
  const { data: rooms } = await service.from('rooms').select('id').eq('hotel_id', hotelId)
  const roomIds = (rooms ?? []).map(r => r.id)
  if (roomIds.length > 0) {
    await service.from('assignments').delete().in('room_id', roomIds)
  }

  // 2. payment_logs — 거래기록은 보존, 호텔 연결만 해제 (FK 기본 NO ACTION이 hotels 삭제를 막음)
  await service.from('payment_logs').update({ hotel_id: null }).eq('hotel_id', hotelId)

  // 3. hotels 삭제 → rooms, staff, guest_codes, push_subscriptions, supplies,
  //    supply_requests, maintenance_requests, api_keys, room_logs 캐스케이드 삭제
  const { error: delError } = await service.from('hotels').delete().eq('id', hotelId)
  if (delError) throw delError

  // 4. Supabase Auth 계정 삭제
  const { error: authError } = await service.auth.admin.deleteUser(userId)
  if (authError) throw authError

  // 5. 세션 종료
  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}

export const DELETE = withApiError(deleteHandler)
