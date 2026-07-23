// 인메모리 Rate Limiter (단일 인스턴스 환경용)
// 프로덕션 멀티 인스턴스: UPSTASH_REDIS_REST_URL/TOKEN 환경변수 설정 후 @upstash/ratelimit 교체 권장
type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  entry.count++
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: limit - entry.count }
}
