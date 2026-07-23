import { NextRequest, NextResponse } from 'next/server'
import { requireGuest } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'
import { fetchGuestAssignments } from '@/lib/guest-work'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'

async function getHandler(request: NextRequest) {
  const { hotelId, service } = await requireGuest(request)
  return NextResponse.json(await fetchGuestAssignments(service, hotelId))
}

export const GET = withApiError(getHandler)
