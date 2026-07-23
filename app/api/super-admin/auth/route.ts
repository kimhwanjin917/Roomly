import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { superAdminHash } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { COOKIES } from '@/lib/constants'

const SESSION_MAX_AGE = 60 * 60 * 8 // 8시간

/** 길이가 달라도 예외 없이 false를 돌려주는 상수 시간 비교 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

async function postHandler(request: NextRequest) {
  const { password } = await request.json()
  if (!password) throw ApiError.badRequest('비밀번호를 입력해주세요.', 'missing_password')

  const expected = process.env.SUPER_ADMIN_PASSWORD_HASH
  const hash = superAdminHash(password)
  if (!expected || !safeEqual(hash, expected)) {
    throw ApiError.unauthorized('비밀번호가 올바르지 않습니다.', 'invalid_password')
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIES.superAdmin, hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}

export const POST = withApiError(postHandler)
