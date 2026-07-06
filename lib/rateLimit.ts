import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * T-070: Rate Limiting
 * Upstash Redis 기반 리미터 3종:
 *   - auth:  10회/분 per IP   (/api/auth/*)
 *   - admin: 60회/분 per user (/api/admin/*)
 *   - qr:    20회/분 per IP   (/api/auth/qr)
 *
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN이 없으면(로컬 개발)
 * 기존 인메모리 슬라이딩 카운터로 폴백해 동작을 보존한다.
 */

// ── 인메모리 폴백 (기존 구현 유지) ──────────────────────
const store = new Map<string, { count: number; reset: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ── Upstash 리미터 ──────────────────────────────────────
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

const redis = getRedis()

function createLimiter(tokens: number, prefix: string): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, '1 m'),
    prefix: `roomly:rl:${prefix}`,
  })
}

export const authLimiter = createLimiter(10, 'auth')
export const adminLimiter = createLimiter(60, 'admin')
export const qrLimiter = createLimiter(20, 'qr')

/**
 * 리미터 적용. true = 허용, false = 초과(429 응답 필요).
 * Upstash 미설정 시 인메모리 폴백, Redis 장애 시 허용(가용성 우선).
 */
export async function checkLimit(
  limiter: Ratelimit | null,
  key: string,
  fallback: { limit: number; windowMs: number }
): Promise<boolean> {
  if (!limiter) {
    return checkRateLimit(key, fallback.limit, fallback.windowMs)
  }
  try {
    const { success } = await limiter.limit(key)
    return success
  } catch {
    return true
  }
}
