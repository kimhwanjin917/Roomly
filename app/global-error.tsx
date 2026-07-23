'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import RoomlyMark from '@/components/RoomlyMark'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <RoomlyMark size={48} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Roomly</h1>
            <p className="text-sm text-slate-500 mb-10">하우스키핑 관리 시스템</p>

            <div className="mb-8">
              <p className="text-6xl font-bold text-blue-600 mb-4">500</p>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                문제가 발생했습니다
              </h2>
              <p className="text-sm text-slate-500">
                {error?.message || '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
              </p>
            </div>

            <button
              onClick={reset}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
