import { NextRequest, NextResponse } from 'next/server'
import { ApiError, withApiError } from '@/lib/api-error'
import { COOKIES, isLocale } from '@/lib/constants'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

async function postHandler(request: NextRequest) {
  const { locale } = await request.json() as { locale?: string }
  if (!isLocale(locale)) throw ApiError.badRequest('지원하지 않는 언어입니다.')

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIES.locale, locale, { path: '/', maxAge: ONE_YEAR_SECONDS })
  return response
}

export const POST = withApiError(postHandler)
