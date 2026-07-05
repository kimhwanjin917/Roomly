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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiKey(request)
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json() as { status?: string; checkin_time?: string | null }

  // 허용된 필드만 업데이트
  const update: Record<string, unknown> = {}
  if (body.status !== undefined) update.status = body.status
  if ('checkin_time' in body) update.checkin_time = body.checkin_time

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('rooms')
    .update(update)
    .eq('id', params.id)
    .eq('hotel_id', auth.hotelId)
    .select('id, number, floor, type, status, checkinTime:checkin_time')
    .single()

  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(data)
}
