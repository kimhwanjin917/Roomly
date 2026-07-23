import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { TrialEndingEmail } from '@/emails/TrialEndingEmail'
import { withApiError } from '@/lib/api-error'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** KST 기준 YYYY-MM-DD */
function kstDateStr(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * T-087: 무료체험(3개월) 만료 알림 크론
 * trial_ends_at이 KST 날짜 기준 D-3 또는 D-1인 trial 호텔에 알림 이메일 발송.
 * email_logs로 같은 날 중복 발송 방지.
 */
async function getHandler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const todayKst = kstDateStr(new Date())

  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, trial_ends_at')
    .eq('subscription_plan', 'trial')
    .not('trial_ends_at', 'is', null)

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  // 오늘(KST) 발송된 이메일 로그 — 같은 날 중복 발송 방지
  const todayStartUtc = new Date(new Date(`${todayKst}T00:00:00+09:00`)).toISOString()
  const { data: todayLogs } = await service
    .from('email_logs')
    .select('hotel_id, subject')
    .gte('created_at', todayStartUtc)

  // 관리자 이메일 조회
  const {
    data: { users },
  } = await service.auth.admin.listUsers()

  let sent = 0
  for (const hotel of hotels) {
    const endsAtKst = kstDateStr(new Date(hotel.trial_ends_at as string))

    // KST 날짜 기준 남은 일수
    const daysLeft = Math.round(
      (Date.parse(`${endsAtKst}T00:00:00Z`) - Date.parse(`${todayKst}T00:00:00Z`)) / 86_400_000
    )
    if (daysLeft !== 3 && daysLeft !== 1) continue

    const adminUser = users.find((u) => u.app_metadata?.hotel_id === hotel.id)
    if (!adminUser?.email) continue

    const subject = `[Roomly] 무료체험이 ${daysLeft}일 후 종료됩니다 — ${hotel.name}`

    // 오늘 같은 제목으로 이미 발송했으면 스킵
    const alreadySent = (todayLogs ?? []).some(
      (log) => log.hotel_id === hotel.id && log.subject === subject
    )
    if (alreadySent) continue

    await sendEmail({
      to: adminUser.email,
      subject,
      hotelId: hotel.id,
      react: TrialEndingEmail({
        hotelName: hotel.name as string,
        daysLeft,
        endsAt: endsAtKst,
      }),
    })
    sent++
  }

  return NextResponse.json({ sent })
}

export const GET = withApiError(getHandler)
