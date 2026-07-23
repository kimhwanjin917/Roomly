import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'
import { DEMO_ACCOUNT } from '@/lib/constants'

/**
 * 공개 데모 진입점 — 랜딩 페이지의 "데모 체험하기" 버튼이 호출한다.
 * 별도 로그인 없이 공개 데모 관리자 계정으로 즉시 입장시킨다.
 */
async function getHandler(request: NextRequest) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword(DEMO_ACCOUNT)

  if (error) {
    console.error('[demo] 데모 계정 로그인 실패', error)
    return NextResponse.redirect(new URL('/login?error=demo_unavailable', request.url))
  }

  return NextResponse.redirect(new URL('/admin', request.url))
}

export const GET = withApiError(getHandler)
export const dynamic = 'force-dynamic'
