import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { requireStaff } from '@/lib/guards'
import { withApiError } from '@/lib/api-error'
import { buildQrUrl } from '@/lib/qr'

type Params = { params: { id: string } }

/** GET — 현재 QR을 재발급 없이 조회 */
async function getHandler(_request: NextRequest, { params }: Params) {
  const { hotelId, service } = await requireAdmin()
  const staff = await requireStaff(service, params.id, hotelId)

  return NextResponse.json({ qrUrl: buildQrUrl(staff, hotelId) })
}

/** POST — qr_version을 올려 기존 QR을 무효화하고 새 QR 발급 */
async function postHandler(_request: NextRequest, { params }: Params) {
  const { hotelId, service } = await requireAdmin()
  const staff = await requireStaff(service, params.id, hotelId)

  const qrVersion = staff.qr_version + 1
  await service.from('staff').update({ qr_version: qrVersion }).eq('id', params.id)

  return NextResponse.json({ qrUrl: buildQrUrl({ ...staff, qr_version: qrVersion }, hotelId) })
}

export const GET = withApiError(getHandler)
export const POST = withApiError(postHandler)
