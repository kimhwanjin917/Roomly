'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { C } from '@/lib/theme'
import RoomlyMark from '@/components/RoomlyMark'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 10, fontSize: 14, color: C.text,
  outline: 'none', transition: 'border-color 0.15s',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const registered    = params.get('registered') === '1'
  const qrExpired     = params.get('error') === 'qr_expired'
  const sessionExpired= params.get('error') === 'session_expired'
  const demoUnavailable = params.get('error') === 'demo_unavailable'
  const passwordReset = params.get('reset') === '1'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 클라이언트에서 직접 Supabase에 로그인하면 서버의 실패 횟수 잠금이 우회된다.
    // /api/auth/login이 세션 쿠키까지 세팅하므로 이 경로로만 로그인한다.
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? '이메일 또는 비밀번호를 확인해주세요.')
        setLoading(false)
        return
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    // 서버가 세팅한 세션 쿠키를 클라이언트가 즉시 인지하도록 새로고침한다
    router.push('/admin')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', 'Pretendard', -apple-system, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'fixed', top: -200, left: '30%',
        width: 700, height: 500, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${C.accent}18 0%, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0,
      }}/>

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, justifyContent: 'center' }}>
          <RoomlyMark size={32}/>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>Roomly</span>
        </div>

        {/* Banners */}
        {registered && (
          <div style={{ marginBottom: 16, padding: '11px 14px', background: 'rgba(52,211,153,0.08)', border: `1px solid rgba(52,211,153,0.18)`, borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>호텔 등록이 완료됐습니다. 로그인해주세요.</p>
          </div>
        )}
        {(qrExpired || sessionExpired) && (
          <div style={{ marginBottom: 16, padding: '11px 14px', background: 'rgba(251,191,36,0.07)', border: `1px solid rgba(251,191,36,0.15)`, borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: C.amber, fontWeight: 600 }}>
              {qrExpired ? 'QR 코드가 만료되었습니다. 관리자에게 새 QR을 요청해주세요.' : '세션이 만료되었습니다. QR을 다시 스캔해주세요.'}
            </p>
          </div>
        )}
        {passwordReset && (
          <div style={{ marginBottom: 16, padding: '11px 14px', background: 'rgba(52,211,153,0.08)', border: `1px solid rgba(52,211,153,0.18)`, borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.</p>
          </div>
        )}
        {demoUnavailable && (
          <div style={{ marginBottom: 16, padding: '11px 14px', background: 'rgba(248,113,113,0.07)', border: `1px solid rgba(248,113,113,0.16)`, borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>데모 계정에 일시적으로 접속할 수 없습니다. 잠시 후 다시 시도해주세요.</p>
          </div>
        )}

        {/* Card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '24px 24px 8px' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: 4 }}>로그인</h1>
            <p style={{ fontSize: 13, color: C.textDim }}>하우스키핑 관리 시스템</p>
          </div>

          <form onSubmit={handleLogin} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@hotel.com"
                style={inputStyle}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.accent }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.accent }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.07)', border: `1px solid rgba(248,113,113,0.16)`, borderRadius: 10 }}>
                <p style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px 0', marginTop: 4,
                background: C.accent, color: '#fff',
                border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.55 : 1,
                letterSpacing: '-0.01em',
                boxShadow: `0 0 28px ${C.accent}44`,
                transition: 'opacity 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        {/* Bottom links */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
          <Link href="/signup" style={{ fontSize: 13, fontWeight: 600, color: C.text, textDecoration: 'none', letterSpacing: '-0.01em' }}>
            호텔 등록하기 →
          </Link>
          <a href="/api/demo" style={{ fontSize: 13, fontWeight: 600, color: C.accent, textDecoration: 'none', letterSpacing: '-0.01em' }}>
            데모 체험하기
          </a>
          <Link href="/forgot-password" style={{ fontSize: 13, color: C.textMid, textDecoration: 'none' }}>
            비밀번호를 잊으셨나요?
          </Link>
          <Link href="/guest" style={{ fontSize: 12, color: C.textDim, textDecoration: 'none' }}>
            일일 근무자 입장
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
