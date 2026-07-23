import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { requireStaff } from '@/lib/guards'
import { ApiError, withApiError } from '@/lib/api-error'
import { isStaffRole, type StaffRole } from '@/lib/constants'

type Params = { params: { id: string } }

interface StaffUpdate {
  name?: string
  phone_number?: string | null
  role?: StaffRole
  qr_version?: number
}

async function patchHandler(request: NextRequest, { params }: Params) {
  const { hotelId, service } = await requireAdmin()

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') throw ApiError.badRequest()

  const { name, phone_number, role } = body as {
    name?: string
    phone_number?: string | null
    role?: string
  }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    throw ApiError.badRequest('직원 이름을 입력해주세요.')
  }
  if (role !== undefined && !isStaffRole(role)) {
    throw ApiError.badRequest('유효하지 않은 역할입니다.')
  }

  const staff = await requireStaff(service, params.id, hotelId)

  const updates: StaffUpdate = {}
  if (name !== undefined) updates.name = name.trim()
  if (phone_number !== undefined) updates.phone_number = phone_number || null

  // 역할이 실제로 바뀌는 경우에만 qr_version+1 → 기존 QR 무효화
  if (role !== undefined && role !== staff.role) {
    updates.role = role
    updates.qr_version = staff.qr_version + 1
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      id: staff.id,
      name: staff.name,
      phone_number: staff.phone_number,
      role: staff.role,
      qr_version: staff.qr_version,
    })
  }

  const { data: updated, error } = await service
    .from('staff')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, phone_number, role, qr_version')
    .single()

  if (error || !updated) {
    console.error('[admin/staff PATCH]', error)
    throw ApiError.internal()
  }

  return NextResponse.json(updated)
}

async function deleteHandler(request: NextRequest, { params }: Params) {
  const { hotelId, service } = await requireAdmin()
  await requireStaff(service, params.id, hotelId)

  const force = request.nextUrl.searchParams.get('force') === 'true'

  // 미완료 배정이 남아 있으면 force 없이는 거부 (실수 삭제 방지)
  if (!force) {
    const { count } = await service
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', params.id)
      .is('completed_at', null)
      .is('cancelled_at', null)

    if (count && count > 0) {
      throw ApiError.conflict(
        `진행 중인 배정이 ${count}건 있습니다.`,
        'has_active_assignments',
        { count },
      )
    }
  }

  await service
    .from('assignments')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('staff_id', params.id)
    .is('completed_at', null)
    .is('cancelled_at', null)

  await service.from('staff').delete().eq('id', params.id)

  return NextResponse.json({ ok: true })
}

export const PATCH = withApiError(patchHandler)
export const DELETE = withApiError(deleteHandler)
