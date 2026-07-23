import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import * as jwt from 'jsonwebtoken'
import { createServiceClient } from '@/lib/supabase/server'
import { ApiError, withApiError } from '@/lib/api-error'
import { COOKIES } from '@/lib/constants'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 일일 근무자(게스트) 코드 로그인 — 코드는 당일 자정(KST)에 만료된다. */
async function postHandler(request: NextRequest) {
  const { hotelId, code } = await request.json()

  if (!hotelId || !code) throw ApiError.badRequest('호텔과 코드를 입력해주세요.')
  if (!UUID_RE.test(String(hotelId))) throw ApiError.badRequest('호텔 정보가 올바르지 않습니다.')

  const service = createServiceClient()
  const { data: guestCode } = await service
    .from('guest_codes')
    .select('id, expires_at')
    .eq('hotel_id', hotelId)
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!guestCode) {
    throw ApiError.unauthorized('코드가 올바르지 않거나 만료되었습니다.', 'invalid_code')
  }

  const expiresAt = new Date(guestCode.expires_at)
  const token = jwt.sign(
    {
      sub: randomUUID(),
      role: 'authenticated',
      iss: 'supabase',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      app_metadata: { hotel_id: hotelId, role: 'guest' },
    },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256' },
  )

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIES.guest, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  })
  return response
}

export const POST = withApiError(postHandler)
