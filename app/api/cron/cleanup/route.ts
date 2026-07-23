import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { daysAgo } from '@/lib/date'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


const RETENTION_DAYS = 7

/** 만료 후 7일이 지난 게스트 코드를 삭제한다. */
async function getHandler(request: NextRequest) {
  const { service } = requireCron(request)

  const { error, count } = await service
    .from('guest_codes')
    .delete({ count: 'exact' })
    .lt('expires_at', daysAgo(RETENTION_DAYS).toISOString())

  if (error) {
    console.error('[cron/cleanup] guest_codes 삭제 실패', error)
    throw ApiError.internal()
  }

  return NextResponse.json({ deleted: { guest_codes: count ?? 0 } })
}

export const GET = withApiError(getHandler)
