import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

/**
 * 데모 호텔을 들어오는 시점에 맞춰 신선하게 만든다.
 *
 * 체크인 시각은 now() 기준으로 심기 때문에 몇 시간만 지나도 과거가 되고,
 * 7일치 실적은 일주일 뒤 창 밖으로 밀려난다. 언제 누가 들어올지 모르는
 * 데모에서 "미리 돌려둔다"는 전제는 성립하지 않으므로, 들어올 때마다 맞춘다.
 *
 * 실패해도 로그인과 이동은 그대로 진행한다 — 신선하지 않은 데모가
 * 못 들어가는 데모보다 낫다.
 */
async function freshenDemoHotel() {
  try {
    const service = createServiceClient()
    const { data: hotel } = await service
      .from('hotels')
      .select('id')
      .eq('name', 'Roomly 데모 호텔')
      .maybeSingle()

    if (!hotel) return
    const { error } = await service.rpc('refresh_demo_hotel', { hotel: hotel.id })
    if (error) console.error('[demo] 신선화 실패', error.message)
  } catch (err) {
    console.error('[demo] 신선화 중 오류', err)
  }
}

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

  await freshenDemoHotel()

  // ?demo=1 은 현황판이 안내 오버레이를 띄울지 판단하는 신호다
  return NextResponse.redirect(new URL('/admin?demo=1', request.url))
}

export const GET = withApiError(getHandler)
export const dynamic = 'force-dynamic'
