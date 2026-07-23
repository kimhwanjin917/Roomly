'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function GuestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hotelId = searchParams.get('h')
  const codeFromQr = searchParams.get('c')

  const [code, setCode] = useState(codeFromQr ?? '')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [needName, setNeedName] = useState(false)
  // QR에 담긴 코드가 재발급으로 만료되면 직접 입력할 수 있게 열어준다
  const [showCodeInput, setShowCodeInput] = useState(!codeFromQr)
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
      body: JSON.stringify({
        hotelId,
        code: code.trim(),
        phone: phone.trim(),
        name: needName ? name.trim() : undefined,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      // 서버가 사용자에게 보여줄 메시지를 내려준다 (code는 분기용)
      if (data.code === 'name_required') {
        setNeedName(true)
      } else if (data.code === 'invalid_code') {
        // QR이 오래됐다는 뜻 — 관리자에게 받은 새 코드를 직접 넣을 수 있게 한다
        setShowCodeInput(true)
      }
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
          {showCodeInput && (
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
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="01012345678"
              disabled={!hotelId}
              autoFocus={!!codeFromQr}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center text-lg font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          {needName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="홍길동"
                autoFocus
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center text-lg font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">처음 방문하셨네요. 이름을 입력하면 직원으로 등록됩니다.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={!hotelId || code.length !== 6 || phone.length < 9 || (needName && !name.trim()) || loading}
            className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {loading ? '확인 중...' : needName ? '등록하고 입장' : '입장'}
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
