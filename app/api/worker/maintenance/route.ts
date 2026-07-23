import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'

function getWorkerToken(req: NextRequest) {
  return req.cookies.get('roomly_worker_session')?.value ?? null
}

export async function POST(req: NextRequest) {
  const token = getWorkerToken(req)
  if (!token) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    return NextResponse.json({ error: '토큰 만료' }, { status: 401 })
  }

  const staffId = payload.app_metadata?.staff_id
  const hotelId = payload.app_metadata?.hotel_id
  if (!staffId || !hotelId) return NextResponse.json({ error: '잘못된 토큰' }, { status: 401 })

  const { roomId, description } = await req.json()
  if (!description?.trim()) return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service.from('maintenance_requests').insert({
    hotel_id: hotelId,
    staff_id: staffId,
    room_id: roomId ?? null,
    description: description.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}
