import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { addBillingInterval } from '@/lib/date'

const TOSS_API_BASE = 'https://api.tosspayments.com/v1'

export const PLAN_PRICES: Record<string, number> = {
  starter: 30000,
  standard: 70000,
  pro: 150000,
}

// T-201: 연 단위 구독 — 월간가 × 10 (2개월 무료)
export const PLAN_PRICES_YEARLY: Record<string, number> = {
  starter: 300000,
  standard: 700000,
  pro: 1500000,
}

export type BillingInterval = 'monthly' | 'yearly'

export function getPlanAmount(plan: string, interval: BillingInterval): number | undefined {
  return interval === 'yearly' ? PLAN_PRICES_YEARLY[plan] : PLAN_PRICES[plan]
}

/** 알 수 없는 값은 monthly로 정규화 */
export function toBillingInterval(value: unknown): BillingInterval {
  return value === 'yearly' ? 'yearly' : 'monthly'
}

/** 주문명 — 결제 화면과 영수증에 그대로 노출된다 */
export function buildOrderName(plan: string, interval: BillingInterval): string {
  return `Roomly ${PLAN_LABELS[plan] ?? plan} 플랜 (${INTERVAL_LABELS[interval]})`
}

export const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: '월간',
  yearly: '연간',
}

export const PLAN_LABELS: Record<string, string> = {
  trial: '무료 체험',
  starter: '스타터',
  standard: '스탠다드',
  pro: '프로',
}

function authHeader() {
  const secret = process.env.TOSS_PAYMENTS_SECRET_KEY ?? ''
  return `Basic ${Buffer.from(`${secret}:`).toString('base64')}`
}

interface TossBillingKeyResponse {
  billingKey: string
  customerKey: string
  [key: string]: unknown
}

interface TossPaymentResponse {
  paymentKey?: string
  orderId?: string
  status?: string
  totalAmount?: number
  code?: string
  message?: string
  [key: string]: unknown
}

export interface ChargeResult {
  success: boolean
  failureReason?: string
  payment?: TossPaymentResponse
}

/**
 * 빌링 인증 성공 콜백(authKey)으로 빌링키 발급
 * POST /v1/billing/authorizations/issue
 */
export async function issueBillingKey(
  authKey: string,
  customerKey: string
): Promise<TossBillingKeyResponse> {
  const res = await fetch(`${TOSS_API_BASE}/billing/authorizations/issue`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ authKey, customerKey }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.message ?? '빌링키 발급에 실패했습니다.')
  }
  return data as TossBillingKeyResponse
}

/**
 * 빌링키로 자동 결제 청구 + 결과를 payment_logs에 기록
 * POST /v1/billing/{billingKey}
 */
export async function chargeBillingKey({
  billingKey,
  customerKey,
  amount,
  orderId,
  orderName,
  hotelId,
  plan,
}: {
  billingKey: string
  customerKey: string
  amount: number
  orderId: string
  orderName: string
  hotelId: string
  plan: string
}): Promise<ChargeResult> {
  let result: ChargeResult

  try {
    const res = await fetch(`${TOSS_API_BASE}/billing/${encodeURIComponent(billingKey)}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerKey, amount, orderId, orderName }),
    })

    const data = (await res.json()) as TossPaymentResponse
    if (res.ok && data.status === 'DONE') {
      result = { success: true, payment: data }
    } else {
      result = {
        success: false,
        failureReason: data?.message ?? `결제 실패 (status: ${data?.status ?? res.status})`,
        payment: data,
      }
    }
  } catch (e) {
    result = {
      success: false,
      failureReason: e instanceof Error ? e.message : '결제 요청 중 오류가 발생했습니다.',
    }
  }

  // 결제 결과 로그 (T-027) — 실패해도 결제 흐름은 막지 않음
  try {
    const service = createServiceClient()
    await service.from('payment_logs').insert({
      hotel_id: hotelId,
      toss_order_id: orderId,
      amount,
      plan,
      status: result.success ? 'success' : 'failed',
      failure_reason: result.failureReason ?? null,
    })
  } catch {
    // 로그 실패는 무시
  }

  return result
}

/**
 * 결제 성공 후 구독 활성화 — 만료일 계산과 hotels 갱신을 한곳에서 처리한다.
 * (success 콜백 / 플랜 변경 / 자동 청구 크론이 공유)
 *
 * 만료일은 addBillingInterval로 계산해 월말 오버플로우(1/31 + 1개월 → 3/3)를 피한다.
 */
export async function activateSubscription(
  service: SupabaseClient,
  params: { hotelId: string; plan: string; interval: BillingInterval; from?: Date },
): Promise<Date> {
  const expiresAt = addBillingInterval(params.from ?? new Date(), params.interval)

  await service
    .from('hotels')
    .update({
      subscription_plan: params.plan,
      pending_plan: null,
      plan_expires_at: expiresAt.toISOString(),
      billing_interval: params.interval,
    })
    .eq('id', params.hotelId)

  return expiresAt
}

/** 구독 결제용 orderId 생성 — 웹훅에서 hotel_id 역추출 가능하도록 포함 */
export function buildOrderId(hotelId: string) {
  return `sub_${hotelId}_${Date.now()}`
}

/** orderId에서 hotel_id 추출 (buildOrderId 형식) */
export function parseHotelIdFromOrderId(orderId: string): string | null {
  const m = orderId.match(
    /^sub_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_\d+$/i
  )
  return m ? m[1] : null
}
