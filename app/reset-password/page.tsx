'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.')
      setLoading(false)
      return
    }
    await supabase.auth.signOut()
    router.push('/login?reset=1')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        <div className="mb-10">
          <h1 className="text-[26px] font-bold text-[#191919] leading-tight">새 비밀번호 설정</h1>
          <p className="text-sm text-[#6B7684] mt-2">새로 사용할 비밀번호를 입력해주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-[#191919] mb-2">새 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="8자 이상"
              className="w-full px-4 py-3.5 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] placeholder:text-[#B0B8C1] focus:outline-none focus:bg-white focus:ring-2 focus:ring-toss-blue transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#191919] mb-2">비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="비밀번호 재입력"
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
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
