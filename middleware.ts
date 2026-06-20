import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { jwtVerify } from 'jose'

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
    return supabaseResponse
  }

  // /api/auth/* — 인증 불필요 (공개 엔드포인트)
  if (pathname.startsWith('/api/auth')) {
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
