'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { loadTossPayments } from '@tosspayments/payment-sdk'

const PLANS = [
  {
    id: 'starter',
    name: '스타터',
    price: 30000,
    features: ['객실 수 무제한', '직원 5명까지', '기본 하우스키핑 관리', '이메일 지원'],
    recommended: false,
  },
  {
    id: 'standard',
    name: '스탠다드',
    price: 70000,
    features: ['객실 수 무제한', '직원 20명까지', '실시간 푸시 알림', '통계 대시보드', '우선 지원'],
    recommended: true,
  },
  {
    id: 'pro',
    name: '프로',
    price: 150000,
    features: ['객실 수 무제한', '직원 무제한', '고급 통계 및 리포트', '카카오 알림톡', '전담 매니저'],
    recommended: false,
  },
]

const PLAN_ORDER: Record<string, number> = { trial: 0, starter: 1, standard: 2, pro: 3 }
const PLAN_LABELS: Record<string, string> = {
  trial: '무료 체험',
  starter: '스타터',
  standard: '스탠다드',
  pro: '프로',
}

interface BillingStatus {
  plan: string
  pendingPlan: string | null
  planExpiresAt: string | null
  hasBillingKey: boolean
  billingInterval?: 'monthly' | 'yearly'
}

interface Invoice {
  id: string
  toss_order_id: string | null
  amount: number | null
  plan: string | null
  status: 'success' | 'failed' | null
  failure_reason: string | null
  created_at: string
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function BillingContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const expired = searchParams.get('expired') === 'true'
  const fail = searchParams.get('fail') === 'true'
  const failReason = searchParams.get('reason')

  const [loading, setLoading] = useState<string | null>(null)
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/status')
      if (res.ok) setStatus(await res.json())
    } catch {}
  }, [])

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/invoices')
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices ?? [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadStatus()
    loadInvoices()
  }, [loadStatus, loadInvoices])

  // 결제 주기 (T-201) — 연간은 2개월 무료 (월간가 × 10)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')

  // Toss 빌링 인증 창 열기 (신규 결제 / 재구독)
  async function startBillingAuth(planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/billing/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval: billingInterval }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientKey) {
        alert(data.error ?? '결제 세션 생성에 실패했습니다.')
        setLoading(null)
        return
      }
      const tossPayments = await loadTossPayments(data.clientKey)
      await tossPayments.requestBillingAuth('카드', {
        customerKey: data.customerKey,
        successUrl: data.successUrl,
        failUrl: data.failUrl,
      })
    } catch {
      alert('오류가 발생했습니다. 다시 시도해 주세요.')
      setLoading(null)
    }
  }

  // 플랜 변경 (T-025)
  async function changePlan(planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlan: planId, targetInterval: billingInterval }),
      })
      const data = await res.json()
      if (data.requiresPayment) {
        // 빌링키 없음 → 결제 UI로 유도
        await startBillingAuth(planId)
        return
      }
      if (!res.ok) {
        alert(data.error ?? '플랜 변경에 실패했습니다.')
        return
      }
      if (data.intervalChanged) {
        setNotice(`다음 결제부터 ${data.interval === 'yearly' ? '연간(2개월 무료)' : '월간'} 주기로 청구됩니다.`)
        await Promise.all([loadStatus(), loadInvoices()])
        return
      }
      if (data.pending) {
        setNotice(`결제 만료일부터 ${PLAN_LABELS[planId] ?? planId} 플랜으로 변경됩니다.`)
      } else {
        setNotice(`${PLAN_LABELS[planId] ?? planId} 플랜으로 변경되었습니다.`)
      }
      await Promise.all([loadStatus(), loadInvoices()])
    } catch {
      alert('오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(null)
    }
  }

  // 구독 해지 (T-026)
  async function cancelSubscription() {
    setCancelling(true)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? '구독 해지에 실패했습니다.')
        return
      }
      setShowCancelModal(false)
      setNotice('구독이 해지되었습니다. 남은 기간 동안은 계속 이용할 수 있습니다.')
      await loadStatus()
    } catch {
      alert('오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setCancelling(false)
    }
  }

  const currentPlan = status?.plan ?? 'trial'
  const isPaidPlan = currentPlan !== 'trial'
  const isCancelled = isPaidPlan && status ? !status.hasBillingKey : false

  function handlePlanClick(planId: string) {
    if (!status || !status.hasBillingKey) {
      // 빌링키 없음 (trial 또는 해지 상태) → 빌링 인증부터
      startBillingAuth(planId)
    } else {
      changePlan(planId)
    }
  }

  // T-201: 현재 플랜 카드에서 결제 주기(월간↔연간) 전환 가능 여부
  const currentInterval = status?.billingInterval ?? 'monthly'
  function canSwitchInterval(planId: string) {
    return planId === currentPlan && !isCancelled && !!status?.hasBillingKey && billingInterval !== currentInterval
  }

  function buttonLabel(planId: string) {
    if (!status) return '시작하기'
    if (planId === currentPlan) {
      if (isCancelled) return '재구독'
      if (canSwitchInterval(planId)) return billingInterval === 'yearly' ? '연간으로 전환' : '월간으로 전환'
      return '현재 플랜'
    }
    if (!status.hasBillingKey) return isPaidPlan ? '재구독' : '시작하기'
    const isUpgrade = (PLAN_ORDER[planId] ?? 0) > (PLAN_ORDER[currentPlan] ?? 0)
    return isUpgrade ? '업그레이드' : '다운그레이드'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      {/* 성공 알림 */}
      {success && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-800 font-medium">구독이 시작되었습니다! Roomly 프로 기능을 이용해보세요.</p>
          </div>
        </div>
      )}

      {/* 결제 실패 알림 */}
      {fail && (
        <div className="max-w-4xl mx-auto mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          <p className="font-semibold">결제에 실패했습니다</p>
          <p className="text-sm mt-1">{failReason ?? '카드를 확인한 후 다시 시도해주세요.'}</p>
        </div>
      )}

      {/* 플랜 만료 알림 */}
      {expired && (
        <div className="max-w-4xl mx-auto mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          <p className="font-semibold">플랜이 만료되었습니다</p>
          <p className="text-sm mt-1">서비스 이용을 계속하려면 플랜을 갱신해주세요.</p>
        </div>
      )}

      {/* 안내 알림 */}
      {notice && (
        <div className="max-w-4xl mx-auto mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-800 flex items-center justify-between">
          <p className="text-sm font-medium">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-blue-400 hover:text-blue-600 text-sm ml-4">
            닫기
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">요금제 선택</h1>
          <p className="text-gray-500 text-base">호텔에 맞는 플랜을 선택하세요</p>
        </div>

        {/* 현재 구독 상태 */}
        {status && isPaidPlan && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">현재 플랜</p>
              <p className="text-lg font-bold text-gray-900">
                {PLAN_LABELS[currentPlan] ?? currentPlan}
                {isCancelled && (
                  <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 align-middle">
                    기간 만료 후 중단
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isCancelled
                  ? `${formatDate(status.planExpiresAt)}까지 이용 가능`
                  : `다음 결제일: ${formatDate(status.planExpiresAt)}`}
              </p>
              {status.pendingPlan && (
                <p className="text-xs text-blue-600 mt-1">
                  결제 만료일부터 {PLAN_LABELS[status.pendingPlan] ?? status.pendingPlan} 플랜으로 변경됩니다.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <button
                  onClick={() => startBillingAuth(currentPlan)}
                  disabled={loading !== null}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
                >
                  재구독
                </button>
              ) : (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={loading !== null}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60"
                >
                  구독 해지
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3개월 무료 체험 배너 */}
        {!isPaidPlan && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-10 text-center text-white shadow-lg">
            <p className="text-lg font-semibold">모든 플랜 3개월 무료 체험 포함</p>
            <p className="text-indigo-100 text-sm mt-1">카드 등록 후 30일간 무료로 사용해보세요. 언제든지 취소 가능합니다.</p>
          </div>
        )}

        {/* 월간/연간 토글 (T-201) */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                billingInterval === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >월간</button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                billingInterval === 'yearly' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              연간
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                billingInterval === 'yearly' ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-100 text-emerald-700'
              }`}>2개월 무료</span>
            </button>
          </div>
        </div>

        {/* 플랜 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-sm border-2 flex flex-col ${
                  isCurrent
                    ? 'border-emerald-500 shadow-emerald-100 shadow-md'
                    : plan.recommended
                    ? 'border-indigo-500 shadow-indigo-100 shadow-md'
                    : 'border-gray-100'
                }`}
              >
                {/* 현재 플랜 / 추천 배지 */}
                {isCurrent ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">
                      현재 플랜
                    </span>
                  </div>
                ) : plan.recommended ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">
                      추천
                    </span>
                  </div>
                ) : null}

                <div className="p-7 flex flex-col flex-1">
                  {/* 플랜 이름 & 가격 */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                    {billingInterval === 'yearly' ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-gray-900">
                            ₩{(plan.price * 10).toLocaleString('ko-KR')}
                          </span>
                          <span className="text-gray-400 text-sm">/년</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                          <span className="line-through text-gray-300 mr-1.5">₩{(plan.price * 12).toLocaleString('ko-KR')}</span>
                          2개월 무료 — 월 ₩{Math.round(plan.price * 10 / 12).toLocaleString('ko-KR')} 꼴
                        </p>
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-gray-900">
                          ₩{plan.price.toLocaleString('ko-KR')}
                        </span>
                        <span className="text-gray-400 text-sm">/월</span>
                      </div>
                    )}
                  </div>

                  {/* 기능 목록 */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <svg
                          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            isCurrent ? 'text-emerald-600' : plan.recommended ? 'text-indigo-600' : 'text-gray-400'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 결제/변경 버튼 */}
                  <button
                    onClick={() => handlePlanClick(plan.id)}
                    disabled={loading !== null || (isCurrent && !isCancelled && !canSwitchInterval(plan.id))}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${
                      isCurrent && !isCancelled
                        ? 'bg-emerald-50 text-emerald-700 cursor-default'
                        : plan.recommended
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
                      buttonLabel(plan.id)
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 결제 내역 (T-027) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-12">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">결제 내역</h2>
            <p className="text-xs text-gray-400 mt-0.5">최근 20건</p>
          </div>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">결제 내역이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">날짜</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">플랜</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">금액</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 text-gray-500">{formatDate(inv.created_at)}</td>
                      <td className="px-6 py-3.5 text-gray-700">
                        {inv.plan ? PLAN_LABELS[inv.plan] ?? inv.plan : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-700 tabular-nums">
                        {inv.amount != null ? `₩${inv.amount.toLocaleString('ko-KR')}` : '-'}
                      </td>
                      <td className="px-6 py-3.5">
                        {inv.status === 'success' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            성공
                          </span>
                        ) : (
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 cursor-help"
                            title={inv.failure_reason ?? '실패 사유 미확인'}
                          >
                            실패
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 안내 문구 */}
        <p className="text-center text-gray-400 text-xs mt-8">
          결제는 토스페이먼츠를 통해 안전하게 처리됩니다. 구독은 언제든지 취소할 수 있습니다.
        </p>
      </div>

      {/* 구독 해지 확인 모달 (T-026) */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">구독을 해지하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mb-6">
              해지해도 {formatDate(status?.planExpiresAt ?? null)}까지는 계속 이용할 수 있으며, 이후 자동 결제가
              중단됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-60"
              >
                계속 이용
              </button>
              <button
                onClick={cancelSubscription}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              >
                {cancelling ? '해지 중...' : '해지하기'}
              </button>
            </div>
          </div>
        </div>
      )}
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
