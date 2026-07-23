import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function generateApiKey() {
  const key = `rly_${crypto.randomBytes(24).toString('base64url')}`
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const prefix = key.slice(0, 10)
  return { key, hash, prefix }
}

async function getHotelId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (user?.app_metadata?.hotel_id as string) ?? null
}

export async function GET() {
  const hotelId = await getHotelId()
  if (!hotelId) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const service = createServiceClient()
  const { data } = await service
    .from('api_keys')
    .select('id, key_prefix, name, last_used, created_at')
    .eq('hotel_id', hotelId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const hotelId = await getHotelId()
  if (!hotelId) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { name } = await req.json()
  const { key, hash, prefix } = generateApiKey()

  const service = createServiceClient()
  const { error } = await service.from('api_keys').insert({
    hotel_id: hotelId,
    key_hash: hash,
    key_prefix: prefix,
    name: name || 'Default',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ key }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const hotelId = await getHotelId()
  if (!hotelId) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { id } = await req.json()
  const service = createServiceClient()
  await service
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('hotel_id', hotelId)

  return NextResponse.json({ ok: true })
}
