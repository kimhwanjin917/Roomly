import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const force = request.nextUrl.searchParams.get('force') === 'true'
  const service = createServiceClient()

  // 내 호텔 직원인지 확인
  const { data: staff } = await service.from('staff').select('id').eq('id', params.id).eq('hotel_id', hotelId).single()
  if (!staff) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (!force) {
    const { count } = await service
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', params.id)
      .is('completed_at', null)
      .is('cancelled_at', null)

    if (count && count > 0) {
      return NextResponse.json({ error: 'has_active_assignments', count }, { status: 409 })
    }
  }

  // 미완료 배정 일괄 취소
  await service
    .from('assignments')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('staff_id', params.id)
    .is('completed_at', null)
    .is('cancelled_at', null)

  await service.from('staff').delete().eq('id', params.id)

  return NextResponse.json({ ok: true })
}
