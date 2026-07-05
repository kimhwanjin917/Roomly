import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { locale } = await request.json() as { locale: string }
  const allowed = ['ko', 'en', 'vi']
  if (!allowed.includes(locale)) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('roomly_locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return response
}
