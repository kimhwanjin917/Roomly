import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'

const VALID_STATUSES = ['open', 'in_progress', 'resolved'] as const

async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  const { data } = await service
    .from('maintenance_requests')
    .select('*, rooms(number, floor), staff(name)')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

async function patchHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { id, status } = await request.json() as { id?: string; status?: string }
  if (!id) throw ApiError.badRequest('요청 ID가 필요합니다.')
  if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
    throw ApiError.badRequest('유효하지 않은 상태입니다.', 'invalid_status')
  }

  const update: Record<string, unknown> = { status }
  if (status === 'resolved') update.resolved_at = new Date().toISOString()

  const { data, error } = await service
    .from('maintenance_requests')
    .update(update)
    .eq('id', id)
    .eq('hotel_id', hotelId)
    .select()
    .single()

  if (error) {
    console.error('[admin/maintenance PATCH]', error)
    throw ApiError.internal()
  }
  return NextResponse.json(data)
}

export const GET = withApiError(getHandler)
export const PATCH = withApiError(patchHandler)
