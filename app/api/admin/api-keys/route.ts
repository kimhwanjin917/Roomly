import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'

/** 평문 키는 발급 시 한 번만 반환하고, DB에는 SHA-256 해시만 저장한다. */
function generateApiKey() {
  const key = `rly_${randomBytes(24).toString('base64url')}`
  return {
    key,
    hash: createHash('sha256').update(key).digest('hex'),
    prefix: key.slice(0, 10),
  }
}

async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  const { data } = await service
    .from('api_keys')
    .select('id, key_prefix, name, last_used, created_at')
    .eq('hotel_id', hotelId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

async function postHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { name } = await request.json().catch(() => ({ name: undefined }))
  const { key, hash, prefix } = generateApiKey()

  const { error } = await service.from('api_keys').insert({
    hotel_id: hotelId,
    key_hash: hash,
    key_prefix: prefix,
    name: name?.trim() || 'Default',
  })

  if (error) {
    console.error('[admin/api-keys POST]', error)
    throw ApiError.internal()
  }

  return NextResponse.json({ key }, { status: 201 })
}

async function deleteHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const { id } = await request.json()
  if (!id) throw ApiError.badRequest('삭제할 키 ID가 필요합니다.')

  await service
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('hotel_id', hotelId)

  return NextResponse.json({ ok: true })
}

export const GET = withApiError(getHandler)
export const POST = withApiError(postHandler)
export const DELETE = withApiError(deleteHandler)
