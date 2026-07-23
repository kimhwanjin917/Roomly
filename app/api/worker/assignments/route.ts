import { NextRequest, NextResponse } from 'next/server'
import { requireWorker } from '@/lib/auth'
import { withApiError } from '@/lib/api-error'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


async function getHandler(request: NextRequest) {
  const { staffId, service } = await requireWorker(request)

  const { data } = await service
    .from('assignments')
    .select('id, assigned_at, rooms!inner(id, number, floor, type, status, checkin_time, deleted_at)')
    .eq('staff_id', staffId)
    .is('rooms.deleted_at', null)
    .is('completed_at', null)
    .is('cancelled_at', null)

  return NextResponse.json(data ?? [])
}

export const GET = withApiError(getHandler)
