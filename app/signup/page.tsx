'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function SignupPage() {
  const router = useRouter()
  const [hotelName, setHotelName] = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelName, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '가입에 실패했습니다.'); return }
      router.push('/login?registered=1')
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = C.accent
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = C.border
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
        position: 'fixed', top: -150, right: '20%',
        width: 600, height: 500, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${C.accent}14 0%, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0,
      }}/>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <RoomlyMark size={32}/>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>Roomly</span>
        </div>

        {/* Free trial badge */}
        <div style={{
          textAlign: 'center', marginBottom: 20,
          padding: '10px 16px',
          background: `${C.accent}12`, border: `1px solid ${C.accent}28`,
          borderRadius: 10,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>3개월 무료체험 — 신용카드 불필요</p>
          <p style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>무료: 최대 10객실 · 유료 전환 후: 50객실 이상</p>
        </div>

        {/* Card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '24px 24px 8px' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: 4 }}>호텔 등록</h1>
            <p style={{ fontSize: 13, color: C.textDim }}>호텔명과 이메일만 입력하면 바로 시작됩니다</p>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>호텔명</label>
              <input
                type="text"
                value={hotelName}
                onChange={e => setHotelName(e.target.value)}
                required
                placeholder="예: 서울 그랜드 호텔"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>관리자 이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@hotel.com"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="8자 이상"
                minLength={8}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>비밀번호 확인</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="비밀번호 재입력"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
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
              {loading ? '등록 중...' : '호텔 등록하기'}
            </button>
          </form>
        </div>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
          <Link href="/login" style={{ fontSize: 13, color: C.textMid, textDecoration: 'none' }}>
            이미 계정이 있으신가요? <span style={{ color: C.text, fontWeight: 600 }}>로그인</span>
          </Link>
          <p style={{ fontSize: 11, color: C.textDim }}>
            가입 시{' '}
            <Link href="/terms" style={{ color: C.textDim, textDecoration: 'underline' }}>이용약관</Link>
            {' '}및{' '}
            <Link href="/privacy" style={{ color: C.textDim, textDecoration: 'underline' }}>개인정보처리방침</Link>
            에 동의합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
