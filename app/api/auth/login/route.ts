import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiError, HttpError, withApiError } from '@/lib/api-error'

/**
 * 이메일 로그인 — 무차별 대입 방지를 위해 이메일별 실패 횟수를 추적한다.
 *
 * 인메모리 저장이라 인스턴스 단위로만 동작한다 (lib/rateLimit.ts와 같은 한계).
 * 멀티 인스턴스 환경에서는 Redis 기반으로 교체해야 한다.
 */

const MAX_ATTEMPTS = 5
const LOCK_MS = 30 * 60 * 1000

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

async function postHandler(request: NextRequest) {
  const { email, password } = await request.json() as { email?: string; password?: string }

  if (!email || !password) throw ApiError.badRequest('이메일과 비밀번호를 입력해주세요.')

  const attempt = loginAttempts.get(email)
  if (attempt?.lockedUntil && Date.now() < attempt.lockedUntil) {
    const minutesLeft = Math.ceil((attempt.lockedUntil - Date.now()) / 60_000)
    throw new HttpError(
      429,
      'account_locked',
      `로그인 시도가 너무 많습니다. ${minutesLeft}분 후 다시 시도해주세요.`,
      { minutesLeft },
    )
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    const current = loginAttempts.get(email) ?? { count: 0, lockedUntil: 0 }
    current.count++
    if (current.count >= MAX_ATTEMPTS) current.lockedUntil = Date.now() + LOCK_MS
    loginAttempts.set(email, current)

    throw ApiError.unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.', 'invalid_credentials')
  }

  loginAttempts.delete(email)
  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
