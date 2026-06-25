'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        <div className="mb-10">
          <a href="/login" className="text-sm text-[#6B7684] hover:text-toss-blue transition-colors">← 로그인으로 돌아가기</a>
          <h1 className="text-[26px] font-bold text-[#191919] mt-6 leading-tight">비밀번호 찾기</h1>
          <p className="text-sm text-[#6B7684] mt-2">가입한 이메일로 재설정 링크를 보내드립니다.</p>
        </div>

        {sent ? (
          <div className="px-4 py-5 bg-[#E6FBF1] rounded-2xl text-center">
            <p className="text-sm font-semibold text-[#00915A]">이메일을 확인해주세요</p>
            <p className="text-xs text-[#00915A] mt-1">{email}으로 재설정 링크를 발송했습니다.</p>
            <p className="text-xs text-[#6B7684] mt-3">이메일이 오지 않으면 스팸함을 확인해주세요.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-[#191919] mb-2">관리자 이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@hotel.com"
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
                {loading ? '발송 중...' : '재설정 링크 받기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
