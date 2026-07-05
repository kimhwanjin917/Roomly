import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const secret = randomBytes(24).toString('hex')
  const service = createServiceClient()
  await service.from('hotels').update({ webhook_secret: secret }).eq('id', hotelId)

  return NextResponse.json({ secret })
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const service = createServiceClient()
  const { data } = await service.from('hotels').select('webhook_secret').eq('id', hotelId).single()
  // 시크릿이 있으면 마스킹해서 반환 (보안상 전체 노출 안 함)
  const masked = data?.webhook_secret
    ? data.webhook_secret.slice(0, 6) + '...' + data.webhook_secret.slice(-4)
    : null
  return NextResponse.json({ hasSec: !!data?.webhook_secret, masked })
}
