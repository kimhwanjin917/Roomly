'use client'

import Link from 'next/link'

interface ErrorPageProps {
  error: Error
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
          <span className="text-white font-bold text-xl">R</span>
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

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
