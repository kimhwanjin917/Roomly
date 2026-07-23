import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // 만료 후 7일 지난 게스트 코드 삭제
  const { error, count } = await service
    .from('guest_codes')
    .delete({ count: 'exact' })
    .lt('expires_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('[cron/cleanup] guest_codes 삭제 실패:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cron/cleanup] guest_codes ${count}건 삭제 완료`)
  return NextResponse.json({ deleted: { guest_codes: count } })
}
