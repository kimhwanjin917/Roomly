'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function GuestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hotelId = searchParams.get('h')

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hotelId) setError('잘못된 접속 링크입니다. 관리자에게 URL을 다시 받아주세요.')
  }, [hotelId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelId) return
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelId, code: code.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      // 서버가 사용자에게 보여줄 메시지를 내려준다 (code는 분기용)
      setError(data.error ?? '코드가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    router.push('/worker/guest')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Roomly</h1>
          <p className="text-sm text-gray-500 mt-1">일일 근무자 입장</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">오늘의 접속 코드</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6자리 숫자 입력"
              maxLength={6}
              disabled={!hotelId}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={!hotelId || code.length !== 6 || loading}
            className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {loading ? '확인 중...' : '입장'}
          </button>
        </form>

        <div className="text-center mt-6">
          <a href="/login" className="text-xs text-gray-400 hover:text-gray-600">관리자 로그인 →</a>
        </div>
      </div>
    </div>
  )
}

export default function GuestPage() {
  return (
    <Suspense>
      <GuestForm />
    </Suspense>
  )
}
