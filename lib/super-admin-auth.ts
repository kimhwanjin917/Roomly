import { createHmac, timingSafeEqual } from 'crypto'

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000

export function generateSuperAdminToken(): string {
  const ts = Date.now().toString()
  const sig = createHmac('sha256', process.env.SUPER_ADMIN_PASSWORD_HASH!)
    .update(ts)
    .digest('hex')
  return `${ts}.${sig}`
}

export function verifySuperAdminToken(token: string): boolean {
  const dot = token.indexOf('.')
  if (dot === -1) return false
  const ts = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const issuedAt = parseInt(ts, 10)
  if (isNaN(issuedAt) || Date.now() - issuedAt > SESSION_MAX_AGE_MS) return false
  const expected = createHmac('sha256', process.env.SUPER_ADMIN_PASSWORD_HASH!)
    .update(ts)
    .digest('hex')
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
