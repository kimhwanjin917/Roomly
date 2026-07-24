import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'

async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  const { data } = await service
    .from('supplies')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('name')

  return NextResponse.json(data ?? [])
}

async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  // hotel_id는 클라이언트 값이 아니라 세션에서만 결정된다 (마지막에 덮어씀)
  const body = await request.json()
  const { data, error } = await service
    .from('supplies')
    .insert({ ...body, hotel_id: hotelId })
    .select()
    .single()

  if (error) {
    console.error('[admin/supplies POST]', error)
    throw ApiError.internal()
  }
  return NextResponse.json(data)
}

async function putHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { id, hotel_id: _ignored, ...rest } = await request.json()
  if (!id) throw ApiError.badRequest('비품 ID가 필요합니다.')

  const { data, error } = await service
    .from('supplies')
    .update(rest)
    .eq('id', id)
    .eq('hotel_id', hotelId)
    .select()
    .single()

  if (error) {
    console.error('[admin/supplies PUT]', error)
    throw ApiError.internal()
  }
  return NextResponse.json(data)
}

async function patchHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { id, delta } = await request.json()
  if (!id || delta == null) throw ApiError.badRequest('비품 ID와 delta가 필요합니다.')
  if (typeof delta !== 'number' || !Number.isInteger(delta)) throw ApiError.badRequest('delta는 정수여야 합니다.')

  const { data, error } = await service.rpc('adjust_supply_stock', {
    p_supply_id: id,
    p_hotel_id: hotelId,
    p_delta: delta,
  })

  if (error) {
    console.error('[admin/supplies PATCH]', error)
    throw ApiError.internal()
  }
  return NextResponse.json({ stock: data as number })
}

export const GET = withApiError(getHandler)
export const POST = withApiError(postHandler)
export const PUT = withApiError(putHandler)
export const PATCH = withApiError(patchHandler)
