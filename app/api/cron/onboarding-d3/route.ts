import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import OnboardingD3Email from '@/emails/OnboardingD3Email'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'

  // 가입 72~96시간 사이 + 직원 있음 + first_accessed_at IS NULL (QR 미접속)
  const now = new Date()
  const from = new Date(now.getTime() - 96 * 60 * 60 * 1000)
  const to = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, created_at, admin_email')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    // 직원이 아예 없는 경우 제외
    const { count: totalStaff } = await service
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotel.id)
    if ((totalStaff ?? 0) === 0) continue

    // QR 미접속 직원이 1명 이상인 호텔
    const { count: staffCount } = await service
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotel.id)
      .is('first_accessed_at', null)
    if ((staffCount ?? 0) === 0) continue

    await sendEmail({
      to: hotel.admin_email,
      subject: '[Roomly] 직원들이 아직 QR을 받지 못했어요',
      react: OnboardingD3Email({ hotelName: hotel.name, appUrl }),
    }).catch(() => {})
    sent++
  }

  return NextResponse.json({ sent })
}
