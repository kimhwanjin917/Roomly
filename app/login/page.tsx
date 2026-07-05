'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const registered = params.get('registered') === '1'
  const verified = params.get('verified') === '1'
  const qrExpired = params.get('error') === 'qr_expired'
  const sessionExpired = params.get('error') === 'session_expired'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json()
      if (data.error === 'account_locked') {
        setError(`로그인 시도가 너무 많습니다. ${data.minutesLeft}분 후 다시 시도해주세요.`)
      } else {
        setError('이메일 또는 비밀번호를 확인해주세요.')
      }
      setLoading(false)
      return
    }
    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Roomly</h1>
          <p className="text-sm text-slate-500 mt-1">하우스키핑 관리 시스템</p>
        </div>

        {registered && (
          <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 text-center">
            호텔 등록이 완료됐습니다. 로그인해주세요.
          </div>
        )}

        {verified && (
          <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 text-center">
            이메일 인증 완료. 로그인해주세요.
          </div>
        )}

        {qrExpired && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 text-center">
            QR이 무효화되었습니다. 관리자에게 새 QR을 요청하세요.
          </div>
        )}

        {sessionExpired && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 text-center">
            세션이 만료되었습니다. QR을 다시 스캔해주세요.
          </div>
        )}

        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@hotel.com"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <a href="/reset-password" className="block text-sm text-slate-500 hover:text-blue-600 transition-colors">
            비밀번호 찾기
          </a>
          <a href="/signup" className="block text-sm font-medium text-slate-800 hover:text-blue-600 transition-colors">
            호텔 등록하고 3개월 무료 체험 →
          </a>
          <a href="/guest" className="block text-sm text-slate-400 hover:text-slate-600 transition-colors">
            일일 근무자 입장
          </a>
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
