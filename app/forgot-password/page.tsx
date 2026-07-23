'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { C } from '@/lib/theme'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 10, fontSize: 14, color: C.text,
  outline: 'none', transition: 'border-color 0.15s',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    if (error) {
      setError('이메일 발송에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
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
        position: 'fixed', top: -200, left: '35%',
        width: 600, height: 500, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${C.accent}14 0%, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0,
      }}/>

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        {/* Back link */}
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: C.textMid, textDecoration: 'none',
          marginBottom: 32,
        }}>
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
            <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H3.31l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L3.31 7.25H13.25A.75.75 0 0 1 14 8Z" clipRule="evenodd"/>
          </svg>
          로그인으로 돌아가기
        </Link>

        {/* Card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '24px 24px 8px' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: 4 }}>비밀번호 찾기</h1>
            <p style={{ fontSize: 13, color: C.textDim }}>가입한 이메일로 재설정 링크를 보내드립니다.</p>
          </div>

          <div style={{ padding: '20px 24px 24px' }}>
            {sent ? (
              <div style={{ padding: '20px', background: 'rgba(52,211,153,0.07)', border: `1px solid rgba(52,211,153,0.16)`, borderRadius: 12, textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(52,211,153,0.12)', margin: '0 auto 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 20 20" fill={C.green} style={{ width: 20, height: 20 }}>
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 6 }}>이메일을 확인해주세요</p>
                <p style={{ fontSize: 12, color: C.textMid }}>{email}으로 재설정 링크를 발송했습니다.</p>
                <p style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>이메일이 오지 않으면 스팸함을 확인해주세요.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>관리자 이메일</label>
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
                  {loading ? '발송 중...' : '재설정 링크 받기'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
