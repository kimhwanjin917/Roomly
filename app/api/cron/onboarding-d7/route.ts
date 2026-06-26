import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import OnboardingD7Email from '@/emails/OnboardingD7Email'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'

  // 가입 7~8일 사이 + 배정 완료 1건 이상
  const now = new Date()
  const from = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
  const to = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, created_at, admin_email')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const { data: assignments } = await service
      .from('assignments')
      .select('staff_id, assigned_at, completed_at, staff:staff_id(name), rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotel.id)
      .gte('completed_at', weekStart)
      .not('completed_at', 'is', null)

    if (!assignments?.length) continue

    const staffMap = new Map<string, { name: string; count: number; totalMinutes: number }>()
    for (const a of assignments) {
      const id = a.staff_id ?? 'guest'
      const name = (a.staff as unknown as { name: string } | null)?.name ?? '게스트'
      if (!staffMap.has(id)) staffMap.set(id, { name, count: 0, totalMinutes: 0 })
      const s = staffMap.get(id)!
      s.count++
      if (a.completed_at && a.assigned_at) {
        s.totalMinutes += (new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / 60000
      }
    }

    const staffStats = Array.from(staffMap.values()).map(s => ({
      name: s.name,
      completed: s.count,
      avgMinutes: s.count > 0 ? Math.round(s.totalMinutes / s.count) : null,
    }))

    const totalMinutes = staffStats.reduce((sum, s) => sum + (s.avgMinutes ?? 0) * s.completed, 0)
    const avgMinutes = assignments.length > 0 ? Math.round(totalMinutes / assignments.length) : null
    const topStaff = staffStats.sort((a, b) => (a.avgMinutes ?? 999) - (b.avgMinutes ?? 999))[0]?.name ?? null

    await sendEmail({
      to: hotel.admin_email,
      subject: `[Roomly] ${hotel.name}의 첫 7일 현황`,
      react: OnboardingD7Email({
        hotelName: hotel.name,
        appUrl,
        completed: assignments.length,
        avgMinutes,
        topStaff,
        staffStats,
      }),
    }).catch(() => {})
    sent++
  }

  return NextResponse.json({ sent })
}
