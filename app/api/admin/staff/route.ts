import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { isStaffRole, type StaffRole } from '@/lib/constants'
import { buildQrUrl } from '@/lib/qr'

async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { name, phone_number, role } = await request.json()
  if (!name?.trim()) throw ApiError.badRequest('직원 이름을 입력해주세요.')

  const staffRole: StaffRole = isStaffRole(role) ? role : 'housekeeping'
  const authId = randomUUID()

  const { data: staff, error } = await service
    .from('staff')
    .insert({
      hotel_id: hotelId,
      name: name.trim(),
      phone_number: phone_number ?? null,
      auth_id: authId,
      qr_version: 1,
      role: staffRole,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[admin/staff POST]', error)
    throw ApiError.internal()
  }

  const qrUrl = buildQrUrl(
    { id: staff.id, auth_id: authId, qr_version: 1, role: staffRole },
    hotelId,
  )

  return NextResponse.json({ staffId: staff.id, qrUrl })
}

export const POST = withApiError(postHandler)
