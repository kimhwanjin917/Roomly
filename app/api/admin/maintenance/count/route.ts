import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })
  const hotelId = user.app_metadata?.hotel_id as string

  const service = createServiceClient()
  const { count } = await service
    .from('maintenance_requests')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .eq('status', 'open')

  return NextResponse.json({ count: count ?? 0 })
}
