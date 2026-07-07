import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

async function verifyApiKey(request: NextRequest): Promise<{ hotelId: string } | null> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null

  const rawKey = auth.slice(7)
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const service = createServiceClient()
  const { data } = await service.from('api_keys').select('hotel_id, id').eq('key_hash', keyHash).single()
  if (!data) return null

  // last_used_at 업데이트 (비차단)
  service.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {})

  return { hotelId: data.hotel_id }
}

async function getHandler(request: NextRequest) {
  const auth = await verifyApiKey(request)
  if (!auth) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data } = await service
    .from('rooms')
    .select('id, number, floor, type, status, checkinTime:checkin_time')
    .eq('hotel_id', auth.hotelId)
    .is('deleted_at', null)
    .order('floor').order('number')

  return NextResponse.json(data ?? [])
}

export const GET = withApiError(getHandler)
