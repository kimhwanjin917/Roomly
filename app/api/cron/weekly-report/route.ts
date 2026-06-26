import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { WeeklyReportEmail } from '@/emails/WeeklyReportEmail'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  const kstOffset = 9 * 60 * 60 * 1000
  const now = new Date()
  const kstNow = new Date(now.getTime() + kstOffset)

  const weekEnd = new Date(kstNow)
  weekEnd.setHours(0, 0, 0, 0)
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekEnd.getDate() - 7)

  const prevWeekEnd = new Date(weekStart)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(weekStart.getDate() - 7)

  const fmt = (d: Date) => d.toISOString().replace('Z', '+09:00')
  const weekStartStr = fmt(weekStart)
  const weekEndStr = fmt(weekEnd)
  const prevWeekStartStr = fmt(prevWeekStart)
  const prevWeekEndStr = fmt(prevWeekEnd)

  const weekLabel = `${weekStart.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ~ ${new Date(weekEnd.getTime() - 1).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`

  const { data: hotels } = await service.from('hotels').select('id, name, admin_email')
  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const { count: totalRooms } = await service
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotel.id)
      .is('deleted_at', null)

    const [{ data: thisWeekAssignments }, { data: prevWeekAssignments }] = await Promise.all([
      service
        .from('assignments')
        .select('staff_id, assigned_at, completed_at, staff:staff_id(name), rooms!inner(hotel_id)')
        .eq('rooms.hotel_id', hotel.id)
        .gte('completed_at', weekStartStr)
        .lt('completed_at', weekEndStr)
        .not('completed_at', 'is', null),
      service
        .from('assignments')
        .select('id, rooms!inner(hotel_id)')
        .eq('rooms.hotel_id', hotel.id)
        .gte('completed_at', prevWeekStartStr)
        .lt('completed_at', prevWeekEndStr)
        .not('completed_at', 'is', null),
    ])

    const completed = thisWeekAssignments?.length ?? 0
    const prevCompleted = prevWeekAssignments?.length ?? 0
    const completionRate = totalRooms ? Math.round((completed / (totalRooms * 7)) * 100) : 0

    const staffMap = new Map<string, { name: string; count: number; totalMinutes: number }>()
    for (const a of thisWeekAssignments ?? []) {
      const staffId = a.staff_id ?? 'guest'
      const staffName = (a.staff as unknown as { name: string } | null)?.name ?? '게스트'
      if (!staffMap.has(staffId)) staffMap.set(staffId, { name: staffName, count: 0, totalMinutes: 0 })
      const s = staffMap.get(staffId)!
      s.count++
      if (a.completed_at && a.assigned_at) {
        s.totalMinutes += (new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / 60000
      }
    }

    const staffStats = Array.from(staffMap.values())
      .sort((a, b) => b.count - a.count)
      .map(s => ({
        name: s.name,
        completed: s.count,
        avgMinutes: s.count > 0 ? Math.round(s.totalMinutes / s.count) : null,
      }))

    await sendEmail({
      to: hotel.admin_email,
      subject: `[Roomly] ${hotel.name} 주간 리포트 — ${weekLabel}`,
      react: WeeklyReportEmail({
        hotelName: hotel.name,
        weekLabel,
        totalRooms: totalRooms ?? 0,
        completed,
        completionRate,
        prevCompleted,
        staffStats,
      }),
    }).catch(() => {})
    sent++
  }

  return NextResponse.json({ sent })
}
