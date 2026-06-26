'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

const PLANS = [
  {
    id: 'starter',
    name: '스타터',
    price: '30,000',
    features: ['최대 50객실', '직원 5명까지', '기본 하우스키핑 관리', '이메일 지원'],
    recommended: false,
  },
  {
    id: 'standard',
    name: '스탠다드',
    price: '70,000',
    features: ['최대 150객실', '직원 20명까지', '실시간 푸시 알림', '통계 대시보드', '우선 지원'],
    recommended: true,
  },
  {
    id: 'pro',
    name: '프로',
    price: '150,000',
    features: ['객실 무제한', '직원 무제한', '고급 통계 및 리포트', '카카오 알림톡', '전담 매니저'],
    recommended: false,
  },
]

function BillingContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const expired = searchParams.get('expired') === 'true'
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/billing/toss/prepare')
      if (!res.ok) throw new Error('prepare failed')
      const { clientKey, customerKey, userEmail, userName } = await res.json()

      const { loadTossPayments } = await import('@tosspayments/payment-sdk')
      const tossPayments = await loadTossPayments(clientKey)
      await tossPayments.requestBillingAuth('카드', {
        customerKey,
        successUrl: `${window.location.origin}/admin/billing/toss-success?plan=${planId}`,
        failUrl: `${window.location.origin}/admin/billing`,
        customerEmail: userEmail ?? '',
        customerName: userName || '관리자',
      })
    } catch {
      alert('결제 중 오류가 발생했습니다. 다시 시도해 주세요.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      {success && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-800 font-medium">구독이 시작되었습니다! Roomly 기능을 이용해보세요.</p>
          </div>
        </div>
      )}

      {expired && (
        <div className="max-w-4xl mx-auto mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          <p className="font-semibold">플랜이 만료되었습니다</p>
          <p className="text-sm mt-1">서비스 이용을 계속하려면 플랜을 갱신해주세요.</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">요금제 선택</h1>
          <p className="text-gray-500 text-base">호텔에 맞는 플랜을 선택하세요</p>
        </div>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-10 text-center text-white shadow-lg">
          <p className="text-lg font-semibold">모든 플랜 3개월 무료 체험 포함</p>
          <p className="text-indigo-100 text-sm mt-1">카드 등록 후 3개월간 무료. 무료 체험 기간 내 취소 시 요금 없음.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-sm border-2 flex flex-col ${
                plan.recommended ? 'border-indigo-500 shadow-indigo-100 shadow-md' : 'border-gray-100'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">추천</span>
                </div>
              )}

              <div className="p-7 flex flex-col flex-1">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">₩{plan.price}</span>
                    <span className="text-gray-400 text-sm">/월</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <svg
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.recommended ? 'text-indigo-600' : 'text-gray-400'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${
                    plan.recommended
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      처리 중...
                    </span>
                  ) : (
                    '3개월 무료 시작하기'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          결제는 토스페이먼츠를 통해 안전하게 처리됩니다. 구독은 언제든지 취소할 수 있습니다.
        </p>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <BillingContent />
    </Suspense>
  )
}
