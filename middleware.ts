import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { jwtVerify } from 'jose'
import { checkRateLimit } from '@/lib/rateLimit'

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /admin/* — Supabase Auth 세션 필요
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const { supabaseResponse, user } = await updateSession(request)
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 플랜 만료 체크 — 페이지 라우트에만 적용 (API 라우트 및 /admin/billing 제외)
    if (
      pathname.startsWith('/admin') &&
      !pathname.startsWith('/api/admin') &&
      pathname !== '/admin/billing'
    ) {
      const hotelId = user.app_metadata?.hotel_id
      if (hotelId) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        try {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/hotels?id=eq.${hotelId}&select=plan_expires_at`,
            {
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
              },
            }
          )
          const [hotel] = await res.json()
          if (hotel?.plan_expires_at && new Date(hotel.plan_expires_at) < new Date()) {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/billing'
            url.searchParams.set('expired', 'true')
            return NextResponse.redirect(url)
          }
        } catch {
          // 만료 체크 실패 시 접근 허용 (가용성 우선)
        }
      }
    }

    return supabaseResponse
  }

  // /api/auth/* — 인증 불필요 (공개 엔드포인트), Rate limit 적용
  if (pathname.startsWith('/api/auth')) {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    if (!checkRateLimit(`auth:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
    }
    return NextResponse.next()
  }

  // /worker/[staffId] — roomly_worker_session 쿠키 검증
  if (pathname.match(/^\/worker\/(?!guest)[^/]+/)) {
    const workerSession = request.cookies.get('roomly_worker_session')
    if (!workerSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    try {
      const { payload } = await jwtVerify(workerSession.value, getJwtSecret())
      const staffIdInUrl = pathname.split('/')[2]
      const staffIdInToken = (payload.app_metadata as any)?.staff_id
      if (staffIdInToken !== staffIdInUrl) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // /worker/guest — roomly_guest_session 쿠키 검증
  if (pathname === '/worker/guest') {
    const guestSession = request.cookies.get('roomly_guest_session')
    if (!guestSession) {
      return NextResponse.redirect(new URL('/guest', request.url))
    }
    try {
      await jwtVerify(guestSession.value, getJwtSecret())
    } catch {
      return NextResponse.redirect(new URL('/guest', request.url))
    }
    return NextResponse.next()
  }

  // /api/worker/* — roomly_worker_session 필요
  if (pathname.startsWith('/api/worker')) {
    const workerSession = request.cookies.get('roomly_worker_session')
    if (!workerSession) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // /api/guest/* — roomly_guest_session 필요
  if (pathname.startsWith('/api/guest')) {
    const guestSession = request.cookies.get('roomly_guest_session')
    if (!guestSession) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/worker/:path*',
    '/api/admin/:path*',
    '/api/worker/:path*',
    '/api/guest/:path*',
    '/api/auth/:path*',
  ],
}
