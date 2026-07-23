import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireSuperAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'

function generateLicenseKey(): string {
  const part = () => randomBytes(3).toString('hex').toUpperCase()
  return `ROOMLY-${part()}-${part()}`
}

async function getHandler() {
  const { service } = requireSuperAdmin()

  const { data } = await service
    .from('licenses')
    .select('id, key, created_at, used_at, hotel_id')
    .order('created_at', { ascending: false })

  return NextResponse.json({ licenses: data ?? [] })
}

async function postHandler() {
  const { service } = requireSuperAdmin()

  const key = generateLicenseKey()
  const { error } = await service.from('licenses').insert({ key })
  if (error) {
    console.error('[super-admin/license POST]', error)
    throw ApiError.internal('라이선스 발급에 실패했습니다.')
  }

  return NextResponse.json({ key })
}

export const GET = withApiError(getHandler)
export const POST = withApiError(postHandler)
