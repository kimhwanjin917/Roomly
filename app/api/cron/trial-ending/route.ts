import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import { kstDateStr } from '@/lib/date'
import { TrialEndingEmail } from '@/emails/TrialEndingEmail'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/**
 * T-087: 무료체험(3개월) 만료 알림 크론
 *
 * trial_ends_at이 KST 날짜 기준 D-3 또는 D-1인 trial 호텔에 알림 메일을 보낸다.
 * 같은 날 중복 발송은 email_logs의 (hotel_id, subject)로 막는다.
 *
 * 관리자 주소는 hotels.admin_email을 쓴다 — auth.admin.listUsers()는 페이지네이션
 * 기본값(50명) 때문에 사용자가 많아지면 조용히 누락된다.
 */
const NOTIFY_DAYS_LEFT = [3, 1]

async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)

  const todayKst = kstDateStr()

  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, trial_ends_at, admin_email')
    .eq('subscription_plan', 'trial')
    .not('trial_ends_at', 'is', null)

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  // 오늘(KST) 이미 보낸 메일 — 같은 제목이면 재발송하지 않는다
  const todayStartUtc = new Date(`${todayKst}T00:00:00+09:00`).toISOString()
  const { data: todayLogs } = await service
    .from('email_logs')
    .select('hotel_id, subject')
    .gte('created_at', todayStartUtc)

  const alreadySent = new Set((todayLogs ?? []).map(l => `${l.hotel_id}::${l.subject}`))

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const endsAtKst = kstDateStr(new Date(hotel.trial_ends_at as string))
    const daysLeft = Math.round(
      (Date.parse(`${endsAtKst}T00:00:00Z`) - Date.parse(`${todayKst}T00:00:00Z`)) / 86_400_000,
    )
    if (!NOTIFY_DAYS_LEFT.includes(daysLeft)) continue

    const subject = `[Roomly] 무료체험이 ${daysLeft}일 후 종료됩니다 — ${hotel.name}`
    if (alreadySent.has(`${hotel.id}::${subject}`)) continue

    const ok = await sendEmail({
      to: hotel.admin_email,
      subject,
      hotelId: hotel.id,
      template: 'trial_ending',
      react: TrialEndingEmail({
        hotelName: hotel.name as string,
        daysLeft,
        endsAt: endsAtKst,
      }),
    })
    if (ok) sent++
  }

  return NextResponse.json({ sent })
}

export const GET = withApiError(getHandler)
