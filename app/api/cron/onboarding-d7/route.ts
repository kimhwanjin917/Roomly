import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import { appUrl } from '@/lib/constants'
import { daysAgo } from '@/lib/date'
import { aggregateStaffStats, fetchCompletedAssignments, overallAvgMinutes, fastestStaff } from '@/lib/reports'
import OnboardingD7Email from '@/emails/OnboardingD7Email'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/** 가입 7~8일차 + 완료 배정 1건 이상인 호텔에 첫 주 요약을 보낸다. */
async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)

  const now = new Date()
  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, created_at, admin_email')
    .gte('created_at', daysAgo(8, now).toISOString())
    .lte('created_at', daysAgo(7, now).toISOString())

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  const weekStart = daysAgo(7, now).toISOString()

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const assignments = await fetchCompletedAssignments(service, hotel.id, { from: weekStart })
    if (!assignments.length) continue

    const staffStats = aggregateStaffStats(assignments)

    const ok = await sendEmail({
      to: hotel.admin_email,
      subject: `[Roomly] ${hotel.name}의 첫 7일 현황`,
      react: OnboardingD7Email({
        hotelName: hotel.name,
        appUrl: appUrl(),
        completed: assignments.length,
        avgMinutes: overallAvgMinutes(staffStats),
        topStaff: fastestStaff(staffStats),
        staffStats,
      }),
      hotelId: hotel.id,
      template: 'onboarding_d7',
    })
    if (ok) sent++
  }

  return NextResponse.json({ sent })
}

export const GET = withApiError(getHandler)
