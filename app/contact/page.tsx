'use client'

import { useState } from 'react'
import Link from 'next/link'

const C = {
  bg:      '#0B1215',
  surface: '#17171B',
  card:    '#1A1C20',
  border:  '#212427',
  text:    '#F2F3F4',
  textMid: '#8A8F98',
  textDim: '#4A4F58',
  accent:  '#5e6ad2',
  green:   '#34d399',
  red:     '#f87171',
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 10, fontSize: 14, color: C.text,
  outline: 'none', transition: 'border-color 0.15s',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function ContactPage() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '전송에 실패했습니다.'); return }
      setDone(true)
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = C.accent
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
        position: 'fixed', top: -200, left: '30%',
        width: 700, height: 500, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${C.accent}18 0%, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0,
      }}/>

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        {/* 뒤로 */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: C.textDim, textDecoration: 'none', marginBottom: 32,
        }}>
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 13, height: 13 }}>
            <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H3.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06 1.06L3.56 7.25h9.69A.75.75 0 0 1 14 8Z" clipRule="evenodd"/>
          </svg>
          홈으로
        </Link>

        {done ? (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: '48px 32px', textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: `${C.green}18`, border: `1px solid ${C.green}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <svg viewBox="0 0 16 16" fill={C.green} style={{ width: 22, height: 22 }}>
                <path fillRule="evenodd" d="M12.707 4.293a1 1 0 0 1 0 1.414L7.414 11 3.293 6.879A1 1 0 0 1 4.707 5.465L7.414 8.172l3.879-3.879a1 1 0 0 1 1.414 0Z" clipRule="evenodd"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: 8 }}>문의가 접수되었습니다</h2>
            <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7 }}>
              빠른 시일 내에 입력하신 이메일로 답변 드리겠습니다.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Contact</p>
              <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 900, color: C.text, letterSpacing: '-0.045em', lineHeight: 1.1, marginBottom: 12 }}>
                문의하기
              </h1>
              <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7 }}>
                도입 문의, 기능 제안, 기타 궁금하신 점을 남겨주세요.<br/>
                영업일 기준 1~2일 내 답변 드립니다.
              </p>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <form onSubmit={handleSubmit} style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>이름</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="홍길동"
                    style={inputSt}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>이메일</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="your@hotel.com"
                    style={inputSt}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>문의 내용</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    placeholder="도입 관련 문의, 기능 제안 등 자유롭게 작성해주세요."
                    rows={5}
                    style={{ ...inputSt, resize: 'none' } as React.CSSProperties}
                    onFocus={onFocus}
                    onBlur={onBlur}
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
                    fontSize: 14, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.55 : 1,
                    letterSpacing: '-0.01em',
                    boxShadow: `0 0 28px ${C.accent}44`,
                    transition: 'opacity 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {loading ? '전송 중...' : '문의 보내기'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
