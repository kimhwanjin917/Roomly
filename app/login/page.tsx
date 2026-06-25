'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const registered = params.get('registered') === '1'
  const qrExpired = params.get('error') === 'qr_expired'
  const sessionExpired = params.get('error') === 'session_expired'
  const passwordReset = params.get('reset') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('이메일 또는 비밀번호를 확인해주세요.')
      setLoading(false)
      return
    }
    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        {/* 로고 */}
        <div className="mb-10">
          <div className="w-12 h-12 bg-toss-blue rounded-2xl flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M3 9.5C3 7 5 5 7.5 5h9C18.99 5 21 7 21 9.5v5c0 2.5-2 4.5-4.5 4.5h-9C5 19 3 17 3 14.5v-5Z" opacity={0.3} />
              <path d="M7 10h10M7 14h6" strokeWidth={2} stroke="white" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <h1 className="text-[26px] font-bold text-[#191919] leading-tight">
            Roomly에<br />로그인하세요
          </h1>
          <p className="text-sm text-[#6B7684] mt-2">하우스키핑 관리 시스템</p>
        </div>

        {/* 알림 배너 */}
        {registered && (
          <div className="mb-6 px-4 py-3.5 bg-[#E6FBF1] rounded-2xl">
            <p className="text-sm text-[#00915A] font-medium">호텔 등록이 완료됐습니다. 로그인해주세요.</p>
          </div>
        )}
        {qrExpired && (
          <div className="mb-6 px-4 py-3.5 bg-[#FFF8E6] rounded-2xl">
            <p className="text-sm text-[#B07800] font-medium">QR 코드가 만료되었습니다. 관리자에게 새 QR을 요청해주세요.</p>
          </div>
        )}
        {sessionExpired && (
          <div className="mb-6 px-4 py-3.5 bg-[#FFF8E6] rounded-2xl">
            <p className="text-sm text-[#B07800] font-medium">세션이 만료되었습니다. QR을 다시 스캔해주세요.</p>
          </div>
        )}
        {passwordReset && (
          <div className="mb-6 px-4 py-3.5 bg-[#E6FBF1] rounded-2xl">
            <p className="text-sm text-[#00915A] font-medium">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.</p>
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-[#191919] mb-2">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@hotel.com"
              className="w-full px-4 py-3.5 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] placeholder:text-[#B0B8C1] focus:outline-none focus:bg-white focus:ring-2 focus:ring-toss-blue transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#191919] mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3.5 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] placeholder:text-[#B0B8C1] focus:outline-none focus:bg-white focus:ring-2 focus:ring-toss-blue transition-all"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-[#FFF0F0] rounded-xl">
              <p className="text-sm text-toss-error font-medium">{error}</p>
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-toss-blue hover:bg-toss-blue-hover disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>

        {/* 하단 링크 */}
        <div className="mt-8 space-y-4 text-center">
          <a href="/signup" className="block text-sm font-semibold text-[#191919] hover:text-toss-blue transition-colors">
            무료로 시작하기 →
          </a>
          <a href="/forgot-password" className="block text-sm text-[#6B7684] hover:text-toss-blue transition-colors">
            비밀번호를 잊으셨나요?
          </a>
          <a href="/guest" className="block text-sm text-[#B0B8C1] hover:text-[#6B7684] transition-colors">
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
