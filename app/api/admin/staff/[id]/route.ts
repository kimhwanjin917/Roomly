import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const STAFF_ROLES = ['housekeeping', 'dirty'] as const
type StaffRole = (typeof STAFF_ROLES)[number]

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })

  const { name, phone_number, role } = body as { name?: string; phone_number?: string | null; role?: string }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })
  }
  if (role !== undefined && !STAFF_ROLES.includes(role as StaffRole)) {
    return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })
  }

  const service = createServiceClient()

  // 내 호텔 직원인지 확인 (hotel_id 격리)
  const { data: staff } = await service
    .from('staff')
    .select('id, name, phone_number, role, qr_version')
    .eq('id', params.id)
    .eq('hotel_id', hotelId)
    .single()
  if (!staff) return NextResponse.json({ error: 'forbidden', code: 'forbidden' }, { status: 403 })

  const updates: { name?: string; phone_number?: string | null; role?: StaffRole; qr_version?: number } = {}
  if (name !== undefined) updates.name = name.trim()
  if (phone_number !== undefined) updates.phone_number = phone_number || null

  // 역할이 실제로 바뀌는 경우에만 qr_version+1 → 기존 QR 무효화
  const roleChanged = role !== undefined && role !== staff.role
  if (roleChanged) {
    updates.role = role as StaffRole
    updates.qr_version = staff.qr_version + 1
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      id: staff.id, name: staff.name, phone_number: staff.phone_number,
      role: staff.role, qr_version: staff.qr_version,
    })
  }

  const { data: updated, error } = await service
    .from('staff')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, phone_number, role, qr_version')
    .single()

  if (error || !updated) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const force = request.nextUrl.searchParams.get('force') === 'true'
  const service = createServiceClient()

  // 내 호텔 직원인지 확인
  const { data: staff } = await service.from('staff').select('id').eq('id', params.id).eq('hotel_id', hotelId).single()
  if (!staff) return NextResponse.json({ error: 'forbidden', code: 'forbidden' }, { status: 403 })

  if (!force) {
    const { count } = await service
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', params.id)
      .is('completed_at', null)
      .is('cancelled_at', null)

    if (count && count > 0) {
      return NextResponse.json({ error: 'has_active_assignments', code: 'has_active_assignments', count }, { status: 409 })
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
