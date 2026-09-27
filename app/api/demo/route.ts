import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

async function getHandler(request: NextRequest) {
  const email = process.env.DEMO_EMAIL
  const password = process.env.DEMO_PASSWORD

  if (!email || !password) {
    console.error('[demo] DEMO_EMAIL 또는 DEMO_PASSWORD 환경변수가 설정되지 않았습니다.')
    return NextResponse.redirect(new URL('/login?error=demo_unavailable', request.url))
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[demo] 데모 계정 로그인 실패:', error.code, error.message)
    return NextResponse.redirect(new URL('/login?error=demo_unavailable', request.url))
  }

  // ?demo=1 은 현황판이 안내 오버레이를 띄울지 판단하는 신호다
  return NextResponse.redirect(new URL('/admin?demo=1', request.url))
}

export const GET = withApiError(getHandler)
export const dynamic = 'force-dynamic'
