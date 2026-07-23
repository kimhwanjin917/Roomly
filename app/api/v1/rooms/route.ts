import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

async function verifyApiKey(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const rawKey = auth.slice(7)
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex')

  const service = createServiceClient()
  const { data } = await service
    .from('api_keys')
    .select('hotel_id')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single()

  if (!data) return null

  // last_used 갱신 (비차단)
  service.from('api_keys').update({ last_used: new Date().toISOString() }).eq('key_hash', hash)
  return data.hotel_id
}

export async function GET(req: NextRequest) {
  const hotelId = await verifyApiKey(req)
  if (!hotelId) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const service = createServiceClient()
  const { data } = await service
    .from('rooms')
    .select('id, number, floor, type, status, checkin_time')
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)
    .order('floor')
    .order('number')

  return NextResponse.json({ rooms: data ?? [] })
}
