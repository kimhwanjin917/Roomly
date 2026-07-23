import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import { kstDateStr, kstDayRange, daysAgo } from '@/lib/date'
import { aggregateStaffStats, countRooms, fetchCompletedAssignments } from '@/lib/reports'
import { WeeklyReportEmail } from '@/emails/WeeklyReportEmail'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


function labelFor(startDate: string, endDate: string): string {
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00+09:00`).toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'long',
      day: 'numeric',
    })
  return `${fmt(startDate)} ~ ${fmt(endDate)}`
}

async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)

  // 지난 7일(어제까지) vs 그 이전 7일 — 모두 KST 일자 기준
  const thisStart = kstDayRange(kstDateStr(daysAgo(7))).start
  const thisEnd = kstDayRange(kstDateStr(daysAgo(1))).end
  const prevStart = kstDayRange(kstDateStr(daysAgo(14))).start
  const prevEnd = kstDayRange(kstDateStr(daysAgo(8))).end

  const weekLabel = labelFor(kstDateStr(daysAgo(7)), kstDateStr(daysAgo(1)))

  const { data: hotels } = await service.from('hotels').select('id, name, admin_email')
  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const [totalRooms, thisWeek, prevWeek] = await Promise.all([
      countRooms(service, hotel.id),
      fetchCompletedAssignments(service, hotel.id, { from: thisStart, to: thisEnd }),
      fetchCompletedAssignments(service, hotel.id, { from: prevStart, to: prevEnd }),
    ])

    const completed = thisWeek.length
    // 주간 완료율 = 완료 건수 / (객실 수 × 7일)
    const completionRate = totalRooms ? Math.round((completed / (totalRooms * 7)) * 100) : 0

    const ok = await sendEmail({
      to: hotel.admin_email,
      subject: `[Roomly] ${hotel.name} 주간 리포트 — ${weekLabel}`,
      react: WeeklyReportEmail({
        hotelName: hotel.name,
        weekLabel,
        totalRooms,
        completed,
        completionRate,
        prevCompleted: prevWeek.length,
        staffStats: aggregateStaffStats(thisWeek),
      }),
      hotelId: hotel.id,
      template: 'weekly_report',
    })
    if (ok) sent++
  }

  return NextResponse.json({ sent })
}

export const GET = withApiError(getHandler)
