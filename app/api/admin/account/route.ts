import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

/**
 * 계정 탈퇴 (T-182)
 * 비밀번호 재확인 후 호텔 데이터 전체 삭제 + Supabase Auth 계정 삭제.
 * payment_logs는 전자상거래법 거래기록 보존 의무에 따라 호텔 연결만 끊고 보존한다.
 */
async function deleteHandler(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string | undefined
  if (!hotelId) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const { password } = await request.json() as { password?: string }
  if (!password) {
    return NextResponse.json({ error: 'password_required', code: 'password_required' }, { status: 400 })
  }

  // 비밀번호 재확인 — 세션 쿠키를 건드리지 않는 임시 클라이언트 사용
  const verifier = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { error: pwError } = await verifier.auth.signInWithPassword({
    email: user.email!,
    password,
  })
  if (pwError) {
    return NextResponse.json({ error: 'invalid_password', code: 'invalid_password' }, { status: 403 })
  }

  const service = createServiceClient()

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
  const { error: authError } = await service.auth.admin.deleteUser(user.id)
  if (authError) throw authError

  // 5. 세션 종료
  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}

export const DELETE = withApiError(deleteHandler)
