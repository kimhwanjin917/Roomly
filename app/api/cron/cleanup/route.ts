import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * T-093: 정리 크론
 * - 만료 후 7일이 지난 guest_codes 삭제
 *
 * 참고: 고아 push_subscriptions 정리는 생략.
 *   staff 테이블에 deleted_at 컬럼이 없고(001_init.sql, 013_staff_role.sql 확인),
 *   push_subscriptions.staff_id는 ON DELETE CASCADE라 직원 삭제 시 자동 정리됨.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: deletedCodes, error } = await service
    .from('guest_codes')
    .delete()
    .lt('expires_at', cutoff)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deletedGuestCodes: deletedCodes?.length ?? 0 })
}
