import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import { askClaude } from '@/lib/ai'
import { kstDateStr, kstDayRange, daysAgo } from '@/lib/date'
import {
  aggregateStaffStats,
  countRooms,
  fetchCompletedAssignments,
  type StaffStat,
} from '@/lib/reports'
import { DailyReportEmail } from '@/emails/DailyReportEmail'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/** 실적 요약 한 줄 — AI가 꺼져 있거나 실패하면 요약 없이 발송한다. */
async function generateAISummary(params: {
  totalRooms: number
  completed: number
  completionRate: number
  staffStats: StaffStat[]
}): Promise<string | null> {
  const staffDesc = params.staffStats.length
    ? params.staffStats
        .map(s => `${s.name}: ${s.completed}건${s.avgMinutes ? ` (평균 ${s.avgMinutes}분)` : ''}`)
        .join(', ')
    : '데이터 없음'

  return askClaude(
    `호텔 하우스키핑 일일 실적 데이터를 분석하여 간결한 인사이트를 한국어로 2~3문장 이내로 제공해주세요. 수치를 언급하되 격려와 개선점을 함께 포함해주세요.

데이터:
- 전체 객실: ${params.totalRooms}개
- 완료: ${params.completed}개 (완료율 ${params.completionRate}%)
- 직원별 실적: ${staffDesc}`,
    300,
  )
}

async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)

  // 전날(KST) 실적
  const dateStr = kstDateStr(daysAgo(1))
  const { start, end } = kstDayRange(dateStr)

  const { data: hotels } = await service.from('hotels').select('id, name, admin_email')
  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const [totalRooms, assignments] = await Promise.all([
      countRooms(service, hotel.id),
      fetchCompletedAssignments(service, hotel.id, { from: start, to: end }),
    ])

    const completed = assignments.length
    const completionRate = totalRooms ? Math.round((completed / totalRooms) * 100) : 0
    const staffStats = aggregateStaffStats(assignments)
    const aiSummary = await generateAISummary({ totalRooms, completed, completionRate, staffStats })

    const ok = await sendEmail({
      to: hotel.admin_email,
      subject: `[Roomly] ${hotel.name} 일일 리포트 — ${dateStr}`,
      react: DailyReportEmail({
        hotelName: hotel.name,
        date: dateStr,
        totalRooms,
        completed,
        completionRate,
        staffStats,
        aiSummary: aiSummary ?? undefined,
      }),
      hotelId: hotel.id,
      template: 'daily_report',
    })
    if (ok) sent++
  }

  return NextResponse.json({ sent })
}

export const GET = withApiError(getHandler)
