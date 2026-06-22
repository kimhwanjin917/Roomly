'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OfflinePage() {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const handleOnline = () => router.back()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [router])

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await fetch('/api/worker/assignments', { method: 'HEAD' })
      router.back()
    } catch {
      setRetrying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 text-6xl">📡</div>

      <h1 className="text-2xl font-bold text-white mb-3">오프라인 상태</h1>
      <p className="text-gray-400 mb-2 text-sm leading-relaxed">
        인터넷 연결이 끊어졌습니다.
      </p>
      <p className="text-gray-500 mb-8 text-sm leading-relaxed">
        마지막으로 열었던 배정 목록은<br />
        앱에서 계속 확인할 수 있습니다.
      </p>

      <button
        onClick={handleRetry}
        disabled={retrying}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl transition-colors"
      >
        {retrying ? '연결 확인 중...' : '다시 시도'}
      </button>

      <p className="mt-6 text-xs text-gray-600">
        연결이 복구되면 자동으로 돌아갑니다
      </p>
    </div>
  )
}
