import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import TrialEndingEmail from '@/emails/TrialEndingEmail'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'

  const now = new Date()
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // trial_ends_at이 오늘~7일 후 사이인 호텔 (아직 trial 상태)
  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, trial_ends_at, created_at, admin_email')
    .eq('subscription_plan', 'trial')
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', sevenDaysLater.toISOString())

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const trialEnd = new Date(hotel.trial_ends_at)
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

    const { data: assignments } = await service
      .from('assignments')
      .select('staff_id, assigned_at, completed_at, staff:staff_id(name), rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotel.id)
      .not('completed_at', 'is', null)

    const staffMap = new Map<string, { name: string; count: number; totalMinutes: number }>()
    for (const a of assignments ?? []) {
      const id = a.staff_id ?? 'guest'
      const name = (a.staff as unknown as { name: string } | null)?.name ?? '게스트'
      if (!staffMap.has(id)) staffMap.set(id, { name, count: 0, totalMinutes: 0 })
      const s = staffMap.get(id)!
      s.count++
      if (a.completed_at && a.assigned_at) {
        s.totalMinutes += (new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / 60000
      }
    }

    const totalCompleted = assignments?.length ?? 0
    const totalMinutes = Array.from(staffMap.values()).reduce((sum, s) => sum + s.totalMinutes, 0)
    const avgMinutes = totalCompleted > 0 ? Math.round(totalMinutes / totalCompleted) : null
    const topStaff = Array.from(staffMap.values())
      .sort((a, b) => {
        const aAvg = a.count > 0 ? a.totalMinutes / a.count : 999
        const bAvg = b.count > 0 ? b.totalMinutes / b.count : 999
        return aAvg - bAvg
      })[0]?.name ?? null

    await sendEmail({
      to: hotel.admin_email,
      subject: `[Roomly] 3개월 체험이 ${daysLeft}일 후 종료됩니다`,
      react: TrialEndingEmail({
        hotelName: hotel.name,
        appUrl,
        daysLeft,
        totalCompleted,
        avgMinutes,
        topStaff,
      }),
    }).catch(() => {})
    sent++
  }

  return NextResponse.json({ sent })
}
