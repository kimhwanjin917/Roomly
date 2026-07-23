'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RoomlyMark from '@/components/RoomlyMark'

type Mode = 'checking' | 'request' | 'update'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMode(session ? 'update' : 'request')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setMode('update')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${appUrl}/auth/callback?type=recovery`,
      })
      if (err) {
        setError('메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      setSent(true)
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError('비밀번호 변경에 실패했습니다. 다시 시도해주세요.')
        return
      }
      router.push('/admin')
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <RoomlyMark size={48} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Roomly</h1>
          <p className="text-sm text-slate-500 mt-1">비밀번호 재설정</p>
        </div>

        {mode === 'checking' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center text-sm text-slate-500">
            확인 중...
          </div>
        )}

        {mode === 'request' && (
          sent ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900">메일을 확인하세요</p>
              <p className="text-sm text-slate-500">
                입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일함(스팸함 포함)을 확인해주세요.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequest} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <p className="text-sm text-slate-500">
                가입하신 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
              </p>
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

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {loading ? '발송 중...' : '재설정 링크 보내기'}
              </button>
            </form>
          )
        )}

        {mode === 'update' && (
          <form onSubmit={handleUpdate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <p className="text-sm text-slate-500">새로 사용할 비밀번호를 입력해주세요.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">새 비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="8자 이상"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="비밀번호 재입력"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            로그인으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
}
