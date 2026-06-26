import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { generateSuperAdminToken } from '@/lib/super-admin-auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'Missing password' }, { status: 400 })

  const hash = createHash('sha256').update(password).digest('hex')
  if (hash !== process.env.SUPER_ADMIN_PASSWORD_HASH) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = generateSuperAdminToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set('super_admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return res
}
