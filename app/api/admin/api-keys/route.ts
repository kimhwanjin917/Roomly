import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createHash, randomBytes } from 'crypto'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const service = createServiceClient()
  const { data } = await service.from('api_keys').select('id, label, created_at, last_used_at').eq('hotel_id', hotelId).order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const { label } = await request.json() as { label: string }
  const rawKey = 'rly_' + randomBytes(32).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const service = createServiceClient()
  const { data, error } = await service.from('api_keys').insert({ hotel_id: hotelId, label, key_hash: keyHash }).select('id').single()
  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 })

  return NextResponse.json({ id: data.id, key: rawKey }) // 평문은 한 번만 반환
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const { id } = await request.json() as { id: string }
  const service = createServiceClient()
  await service.from('api_keys').delete().eq('id', id).eq('hotel_id', hotelId)
  return NextResponse.json({ ok: true })
}
