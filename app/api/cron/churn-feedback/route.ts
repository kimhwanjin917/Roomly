import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import { daysAgo } from '@/lib/date'
import ChurnFeedbackEmail from '@/emails/ChurnFeedbackEmail'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/** 가입 7일차 trial 호텔 중 완료 배정이 한 건도 없는 곳에 피드백을 요청한다. */
async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)

  const now = new Date()
  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, created_at, admin_email')
    .eq('subscription_plan', 'trial')
    .gte('created_at', daysAgo(8, now).toISOString())
    .lte('created_at', daysAgo(7, now).toISOString())

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const { count } = await service
      .from('assignments')
      .select('id, rooms!inner(hotel_id)', { count: 'exact', head: true })
      .eq('rooms.hotel_id', hotel.id)
      .not('completed_at', 'is', null)

    if ((count ?? 0) > 0) continue

    const ok = await sendEmail({
      to: hotel.admin_email,
      subject: '[Roomly] 솔직한 의견을 듣고 싶습니다',
      react: ChurnFeedbackEmail({ hotelName: hotel.name }),
      hotelId: hotel.id,
      template: 'churn_feedback',
    })
    if (ok) sent++
  }

  return NextResponse.json({ sent })
}

export const GET = withApiError(getHandler)
