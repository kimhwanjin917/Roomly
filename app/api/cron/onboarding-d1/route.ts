import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import OnboardingD1Email from '@/emails/OnboardingD1Email'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'

  // 가입 24~48시간 사이이고 객실이 0개인 호텔
  const now = new Date()
  const from = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const to = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, created_at, admin_email')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    // 객실 0개인 호텔만
    const { count } = await service
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotel.id)
      .is('deleted_at', null)
    if ((count ?? 0) > 0) continue

    await sendEmail({
      to: hotel.admin_email,
      subject: '[Roomly] 아직 객실을 등록하지 않으셨네요',
      react: OnboardingD1Email({ hotelName: hotel.name, appUrl }),
    }).catch(() => {})
    sent++
  }

  return NextResponse.json({ sent })
}
