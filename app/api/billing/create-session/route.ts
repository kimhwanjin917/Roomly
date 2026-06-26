import { NextResponse } from 'next/server'

// Stripe 결제 세션 생성 → 토스페이먼츠로 이전
// 새 엔드포인트: /api/billing/toss/prepare (GET) + /api/billing/toss/authorize (POST)
export async function POST() {
  return NextResponse.json(
    { error: '이 엔드포인트는 더 이상 사용되지 않습니다. /api/billing/toss/prepare를 사용하세요.' },
    { status: 410 },
  )
}
