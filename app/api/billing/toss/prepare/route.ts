import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: hotel } = await supabase
    .from('hotels')
    .select('id, toss_customer_key')
    .single()

  if (!hotel) return NextResponse.json({ error: 'hotel not found' }, { status: 404 })

  let customerKey = hotel.toss_customer_key
  if (!customerKey) {
    customerKey = `hotel_${hotel.id}`
    await supabase.from('hotels').update({ toss_customer_key: customerKey }).eq('id', hotel.id)
  }

  return NextResponse.json({
    clientKey: process.env.TOSS_PAYMENTS_CLIENT_KEY,
    customerKey,
    userEmail: user.email,
    userName: user.user_metadata?.name ?? '',
  })
}
