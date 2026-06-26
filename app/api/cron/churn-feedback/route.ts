import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import ChurnFeedbackEmail from '@/emails/ChurnFeedbackEmail'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // 가입 후 7일이 된 trial 호텔 중 배정 완료가 한 건도 없는 곳
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const eightDaysAgo = new Date()
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, created_at, admin_email')
    .eq('subscription_plan', 'trial')
    .gte('created_at', eightDaysAgo.toISOString())
    .lte('created_at', sevenDaysAgo.toISOString())

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const { count: assignmentCount } = await service
      .from('assignments')
      .select('id, rooms!inner(hotel_id)', { count: 'exact', head: true })
      .eq('rooms.hotel_id', hotel.id)
      .not('completed_at', 'is', null)

    if ((assignmentCount ?? 0) > 0) continue

    await sendEmail({
      to: hotel.admin_email,
      subject: `[Roomly] 솔직한 의견을 듣고 싶습니다`,
      react: ChurnFeedbackEmail({ hotelName: hotel.name }),
    }).catch(() => {})
    sent++
  }

  return NextResponse.json({ sent })
}
