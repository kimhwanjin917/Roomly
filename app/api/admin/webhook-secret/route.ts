import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireAdmin } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'

/** 시크릿 전체는 발급 직후 한 번만 노출하고, 이후에는 마스킹해서만 보여준다. */
function mask(secret: string): string {
  return `${secret.slice(0, 6)}...${secret.slice(-4)}`
}

async function getHandler() {
  const { hotelId, service } = await requireAdmin()

  const { data } = await service
    .from('hotels')
    .select('webhook_secret')
    .eq('id', hotelId)
    .single()

  const secret = data?.webhook_secret as string | null | undefined
  return NextResponse.json({ hasSec: !!secret, masked: secret ? mask(secret) : null })
}

async function postHandler() {
  const { hotelId, service } = await requireAdmin()

  const secret = randomBytes(24).toString('hex')
  await service.from('hotels').update({ webhook_secret: secret }).eq('id', hotelId)

  return NextResponse.json({ secret })
}

export const GET = withApiError(getHandler)
export const POST = withApiError(postHandler)
