import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

// 이메일별 로그인 실패 횟수 추적
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

async function postHandler(request: NextRequest) {
  const body = await request.json()
  const email = body.email as string
  const password = body.password as string

  if (!email || !password) {
    return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })
  }

  // 계정 잠금 여부 확인
  const now = Date.now()
  const attempt = loginAttempts.get(email)
  if (attempt?.lockedUntil && now < attempt.lockedUntil) {
    const minutesLeft = Math.ceil((attempt.lockedUntil - now) / 60000)
    return NextResponse.json({ error: 'account_locked', code: 'account_locked', minutesLeft }, { status: 429 })
  }

  // Supabase 로그인 시도
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    // 실패 횟수 증가
    const curr = loginAttempts.get(email) ?? { count: 0, lockedUntil: 0 }
    curr.count++
    if (curr.count >= 5) {
      curr.lockedUntil = Date.now() + 30 * 60 * 1000
    }
    loginAttempts.set(email, curr)
    return NextResponse.json({ error: 'invalid_credentials', code: 'invalid_credentials' }, { status: 401 })
  }

  // 로그인 성공 시 실패 기록 초기화
  loginAttempts.delete(email)

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
