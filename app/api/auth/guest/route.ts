import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { withApiError } from '@/lib/api-error'

async function postHandler(request: NextRequest) {
  const { hotelId, code } = await request.json()

  if (!hotelId || !code) return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })
  if (!/^[0-9a-f-]{36}$/.test(hotelId)) return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()

  const { data: guestCode } = await service
    .from('guest_codes')
    .select('id, expires_at')
    .eq('hotel_id', hotelId)
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!guestCode) return NextResponse.json({ error: 'invalid_code', code: 'invalid_code' }, { status: 401 })

  const expiresAt = new Date(guestCode.expires_at)
  const expiresInSec = Math.floor((expiresAt.getTime() - Date.now()) / 1000)

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
    { algorithm: 'HS256' }
  )

  const response = NextResponse.json({ ok: true })
  response.cookies.set('roomly_guest_session', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: expiresInSec,
  })
  return response
}

export const POST = withApiError(postHandler)
