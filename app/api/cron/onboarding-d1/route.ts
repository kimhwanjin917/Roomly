import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import { appUrl } from '@/lib/constants'
import { hoursAgo } from '@/lib/date'
import { countRooms } from '@/lib/reports'
import OnboardingD1Email from '@/emails/OnboardingD1Email'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/** 가입 24~48시간이 지났는데 객실이 0개인 호텔에 안내 메일을 보낸다. */
async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)

  const now = new Date()
  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, created_at, admin_email')
    .gte('created_at', hoursAgo(48, now).toISOString())
    .lte('created_at', hoursAgo(24, now).toISOString())

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue
    if ((await countRooms(service, hotel.id)) > 0) continue

    const ok = await sendEmail({
      to: hotel.admin_email,
      subject: '[Roomly] 아직 객실을 등록하지 않으셨네요',
      react: OnboardingD1Email({ hotelName: hotel.name, appUrl: appUrl() }),
      hotelId: hotel.id,
      template: 'onboarding_d1',
    })
    if (ok) sent++
  }

  return NextResponse.json({ sent })
}

export const GET = withApiError(getHandler)
