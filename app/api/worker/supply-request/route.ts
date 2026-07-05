import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'

type RequestItem = { supplyId: string; quantity: number }

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('roomly_worker_session')
  if (!sessionCookie) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(sessionCookie.value, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const staffId = payload.app_metadata?.staff_id as string
  const hotelId = payload.app_metadata?.hotel_id as string
  if (!staffId || !hotelId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { roomId, items } = (await request.json()) as { roomId?: string; items: RequestItem[] }
  const service = createServiceClient()

  const rows = items.map(item => ({
    hotel_id: hotelId,
    room_id: roomId ?? null,
    staff_id: staffId,
    supply_id: item.supplyId,
    quantity: item.quantity,
  }))

  await service.from('supply_requests').insert(rows)

  // 재고 감소 (RPC가 없을 경우 조용히 무시)
  for (const item of items) {
    try {
      await service.rpc('decrement_supply_stock', { supply_id: item.supplyId, amount: item.quantity })
    } catch {
      // RPC 미구현 시 무시
    }
  }

  return NextResponse.json({ ok: true })
}
