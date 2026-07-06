import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

async function verifyApiKey(request: NextRequest): Promise<{ hotelId: string } | null> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null

  const rawKey = auth.slice(7)
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const service = createServiceClient()
  const { data } = await service.from('api_keys').select('hotel_id, id').eq('key_hash', keyHash).single()
  if (!data) return null

  service.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {})

  return { hotelId: data.hotel_id }
}

export async function GET(request: NextRequest) {
  const auth = await verifyApiKey(request)
  if (!auth) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data } = await service
    .from('assignments')
    .select(`
      id,
      assignedAt:assigned_at,
      isGuest:is_guest,
      staff:staff_id(id, name),
      room:room_id(id, number, floor, status, hotelId:hotel_id)
    `)
    .eq('room.hotel_id', auth.hotelId)
    .is('completed_at', null)
    .is('cancelled_at', null)
    .order('assigned_at', { ascending: false })

  // hotel_id 필터가 join에서 동작하지 않을 수 있으므로 클라이언트에서 한번 더 필터
  const filtered = (data ?? []).filter((a: any) => (a.room as any)?.hotelId === auth.hotelId)

  return NextResponse.json(filtered)
}
