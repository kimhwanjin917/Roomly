import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import * as jwt from 'jsonwebtoken'
import { createServiceClient } from '@/lib/supabase/server'
import { ApiError, withApiError } from '@/lib/api-error'
import { COOKIES } from '@/lib/constants'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 일일 근무자(게스트) 입장 — 코드는 당일 자정(KST)에 만료된다.
 *
 * 전화번호로 같은 코드 세대 안에서만 기존 등록을 재인식한다.
 * 코드가 재발급되면(=세대 교체) 이전 등록은 삭제돼 있으므로 이름부터 다시 받는다.
 */
async function postHandler(request: NextRequest) {
  const { hotelId, code, phone, name } = await request.json()

  if (!hotelId || !code) throw ApiError.badRequest('호텔과 코드를 입력해주세요.')
  if (!UUID_RE.test(String(hotelId))) throw ApiError.badRequest('호텔 정보가 올바르지 않습니다.')

  const cleanPhone = String(phone ?? '').replace(/\D/g, '')
  if (cleanPhone.length < 9) throw ApiError.badRequest('휴대폰 번호를 정확히 입력해주세요.', 'phone_required')

  const service = createServiceClient()
  const { data: guestCode } = await service
    .from('guest_codes')
    .select('id, expires_at')
    .eq('hotel_id', hotelId)
    .eq('code', String(code).trim())
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!guestCode) {
    throw ApiError.unauthorized('코드가 올바르지 않거나 만료되었습니다.', 'invalid_code')
  }

  // 같은 세대에서 같은 번호로 이미 등록했다면 이름을 다시 묻지 않는다
  const { data: existing } = await service
    .from('staff')
    .select('id, name')
    .eq('hotel_id', hotelId)
    .eq('phone_number', cleanPhone)
    .eq('employment_type', 'temp')
    .eq('guest_code_id', guestCode.id)
    .maybeSingle()

  let staffId = existing?.id as string | undefined

  if (!staffId) {
    if (!name?.trim()) {
      throw ApiError.badRequest('처음 방문하셨네요. 이름을 입력해주세요.', 'name_required')
    }
    const { data: created, error } = await service
      .from('staff')
      .insert({
        hotel_id: hotelId,
        name: name.trim(),
        phone_number: cleanPhone,
        auth_id: randomUUID(),
        qr_version: 1,
        role: 'housekeeping',
        employment_type: 'temp',
        guest_code_id: guestCode.id,
        first_accessed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !created) {
      console.error('[auth/guest POST]', error)
      throw ApiError.internal()
    }
    staffId = created.id
  }

  const expiresAt = new Date(guestCode.expires_at)
  const token = jwt.sign(
    {
      sub: randomUUID(),
      role: 'authenticated',
      iss: 'supabase',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      app_metadata: {
        hotel_id: hotelId,
        role: 'guest',
        staff_id: staffId,
        guest_code_id: guestCode.id,
      },
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
