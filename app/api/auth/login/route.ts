import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiError, HttpError, withApiError } from '@/lib/api-error'

// 이메일/IP별 실패 횟수 인메모리 추적 (인스턴스 단위).
// B2B 규모에서는 Supabase Auth 기본 Rate Limit과 함께 충분하며,
// 대규모 분산 공격이 우려될 경우 Supabase login_attempts 테이블로 교체한다.

const MAX_ATTEMPTS = 5
const LOCK_MS = 30 * 60 * 1000
// IP당 윈도우 내 최대 시도 횟수 (여러 계정 스프레이 공격 방어)
const IP_MAX = 20
const IP_WINDOW_MS = 15 * 60 * 1000

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()
const ipAttempts = new Map<string, { count: number; windowStart: number }>()

async function postHandler(request: NextRequest) {
  const { email, password } = await request.json() as { email?: string; password?: string }

  if (!email || !password) throw ApiError.badRequest('이메일과 비밀번호를 입력해주세요.')

  // IP 기반 rate limit (계정 스프레이 공격 방어)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const ipEntry = ipAttempts.get(ip) ?? { count: 0, windowStart: Date.now() }
  if (Date.now() - ipEntry.windowStart > IP_WINDOW_MS) {
    ipEntry.count = 0
    ipEntry.windowStart = Date.now()
  }
  if (ipEntry.count >= IP_MAX) {
    throw new HttpError(429, 'rate_limited', '잠시 후 다시 시도해주세요.', {})
  }
  ipEntry.count++
  ipAttempts.set(ip, ipEntry)

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
  ipAttempts.delete(ip)
  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
