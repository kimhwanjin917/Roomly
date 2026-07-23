import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { nextKstMidnight } from '@/lib/date'

async function postHandler() {
  const { hotelId, service } = await requireAdmin()

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = nextKstMidnight()
  const today = new Date().toISOString().slice(0, 10)

  await service.from('guest_codes').upsert(
    { hotel_id: hotelId, code, date: today, expires_at: expiresAt.toISOString() },
    { onConflict: 'hotel_id,date' },
  )

  return NextResponse.json({ code, expiresAt: expiresAt.toISOString() })
}

export const POST = withApiError(postHandler)
