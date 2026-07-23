import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCron } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/email'
import { appUrl } from '@/lib/constants'
import { hoursAgo } from '@/lib/date'
import OnboardingD3Email from '@/emails/OnboardingD3Email'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/** 전체 직원 수 / QR 미접속 직원 수 (first_accessed_at은 /api/auth/qr에서 기록) */
async function staffCounts(service: SupabaseClient, hotelId: string) {
  const [{ count: total }, { count: neverAccessed }] = await Promise.all([
    service.from('staff').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId),
    service
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .is('first_accessed_at', null),
  ])
  return { total: total ?? 0, neverAccessed: neverAccessed ?? 0 }
}

/** 가입 72~96시간 + 직원이 있고 그중 QR 미접속자가 남은 호텔에 안내 메일을 보낸다. */
async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)

  const now = new Date()
  const { data: hotels } = await service
    .from('hotels')
    .select('id, name, created_at, admin_email')
    .gte('created_at', hoursAgo(96, now).toISOString())
    .lte('created_at', hoursAgo(72, now).toISOString())

  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const { total, neverAccessed } = await staffCounts(service, hotel.id)
    if (total === 0 || neverAccessed === 0) continue

    const ok = await sendEmail({
      to: hotel.admin_email,
      subject: '[Roomly] 직원들이 아직 QR을 받지 못했어요',
      react: OnboardingD3Email({ hotelName: hotel.name, appUrl: appUrl() }),
      hotelId: hotel.id,
      template: 'onboarding_d3',
    })
    if (ok) sent++
  }

  return NextResponse.json({ sent })
}

export const GET = withApiError(getHandler)
