const TOSS_API = 'https://api.tosspayments.com/v1'

function authHeader() {
  const key = process.env.TOSS_PAYMENTS_SECRET_KEY ?? ''
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`
}

export async function issueBillingKey(authKey: string, customerKey: string) {
  const res = await fetch(`${TOSS_API}/billing/authorizations/issue`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ authKey, customerKey }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? '빌링키 발급 실패')
  }
  return res.json() as Promise<{ billingKey: string; customerKey: string }>
}

export interface ChargeParams {
  billingKey: string
  customerKey: string
  amount: number
  orderId: string
  orderName: string
  customerEmail: string
  customerName?: string
}

export async function chargeBillingKey(params: ChargeParams) {
  const res = await fetch(`${TOSS_API}/billing/${encodeURIComponent(params.billingKey)}`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerKey: params.customerKey,
      amount: params.amount,
      orderId: params.orderId,
      orderName: params.orderName,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? '결제 실패')
  }
  return res.json()
}
