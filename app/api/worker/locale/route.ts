import { NextRequest, NextResponse } from 'next/server'
import { withApiError } from '@/lib/api-error'

async function postHandler(request: NextRequest) {
  const { locale } = await request.json() as { locale: string }
  const allowed = ['ko', 'en', 'vi']
  if (!allowed.includes(locale)) return NextResponse.json({ error: 'invalid', code: 'invalid' }, { status: 400 })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('roomly_locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return response
}

export const POST = withApiError(postHandler)
