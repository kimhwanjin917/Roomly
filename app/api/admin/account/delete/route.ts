import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: '호텔 정보 없음' }, { status: 400 })

  const service = createServiceClient()

  // hotel cascade delete: rooms, staff, assignments, room_logs, guest_codes, push_subscriptions 모두 삭제
  const { error: hotelErr } = await service.from('hotels').delete().eq('id', hotelId)
  if (hotelErr) return NextResponse.json({ error: hotelErr.message }, { status: 500 })

  // Supabase Auth 계정 삭제
  const { error: authErr } = await service.auth.admin.deleteUser(user.id)
  if (authErr) {
    console.error('[account/delete] auth 삭제 실패:', authErr)
  }

  return NextResponse.json({ ok: true })
}
