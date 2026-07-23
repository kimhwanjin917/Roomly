import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

async function postHandler(_request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const code = String(Math.floor(100000 + Math.random() * 900000))

  // 당일 자정 KST = UTC 15:00
  const now = new Date()
  const kstMidnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + (now.getUTCHours() >= 15 ? 1 : 0),
      15, 0, 0
    )
  )
  const today = now.toISOString().slice(0, 10)

  const service = createServiceClient()
  await service.from('guest_codes').upsert(
    { hotel_id: hotelId, code, date: today, expires_at: kstMidnight.toISOString() },
    { onConflict: 'hotel_id,date' }
  )

  return NextResponse.json({ code, expiresAt: kstMidnight.toISOString() })
}

export const POST = withApiError(postHandler)
