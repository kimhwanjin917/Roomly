import { NextRequest, NextResponse } from 'next/server'
import { parseMewsEvent } from '@/lib/pms/mews'

// Mews Connector API 수신 엔드포인트 (T-111)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-roomly-webhook-secret')
  if (!process.env.PMS_WEBHOOK_SECRET || secret !== process.env.PMS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 })
  }

  const hotelId = req.headers.get('x-hotel-id')
  if (!hotelId) return NextResponse.json({ error: 'x-hotel-id 헤더 필요' }, { status: 400 })

  const body = await req.json()
  const event = parseMewsEvent(body)
  if (!event) return NextResponse.json({ ok: true, skipped: true })

  // 표준 PMS 웹훅으로 포워드
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pms/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-roomly-webhook-secret': process.env.PMS_WEBHOOK_SECRET!,
    },
    body: JSON.stringify({ hotelId, ...event }),
  })

  return NextResponse.json(await res.json(), { status: res.status })
}
