'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function TossSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const authKey = searchParams.get('authKey')
    const customerKey = searchParams.get('customerKey')
    const plan = searchParams.get('plan')

    if (!authKey || !customerKey || !plan) {
      setError('잘못된 접근입니다.')
      return
    }

    fetch('/api/billing/toss/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, customerKey, plan }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          router.replace('/admin/billing?success=true')
        } else {
          setError(data.error ?? '결제 처리에 실패했습니다.')
        }
      })
      .catch(() => setError('서버 오류가 발생했습니다. 다시 시도해 주세요.'))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={() => router.push('/admin/billing')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-slate-500 text-sm">결제 처리 중입니다...</p>
    </div>
  )
}

export default function TossSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-sm">처리 중...</div>
      </div>
    }>
      <TossSuccessContent />
    </Suspense>
  )
}
