import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'
import { COOKIES } from '@/lib/constants'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/**
 * QR 로그인 — 토큰을 검증하고 워커 세션 쿠키를 심은 뒤 대시보드로 리다이렉트한다.
 * staff.qr_version과 토큰의 qr_version이 다르면(재발급됨) 거부한다.
 */
async function getHandler(request: NextRequest) {
  const loginUrl = (error?: string) =>
    NextResponse.redirect(new URL(error ? `/login?error=${error}` : '/login', request.url))

  const token = request.nextUrl.searchParams.get('token')
  if (!token) return loginUrl()

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch (err) {
    return loginUrl(err instanceof jwt.TokenExpiredError ? 'session_expired' : undefined)
  }

  const { staff_id: staffId, hotel_id: hotelId, qr_version: qrVersion, worker_role: workerRole } =
    payload.app_metadata ?? {}
  if (!staffId || !hotelId) return loginUrl()

  const service = createServiceClient()
  const { data: staff } = await service
    .from('staff')
    .select('qr_version')
    .eq('id', staffId)
    .eq('hotel_id', hotelId)
    .single()

  if (!staff || staff.qr_version !== qrVersion) return loginUrl('qr_expired')

  // 첫 접속 시각 기록 — 온보딩 D3 메일이 "QR 미접속" 판단에 사용한다
  void service
    .from('staff')
    .update({ first_accessed_at: new Date().toISOString() })
    .eq('id', staffId)
    .is('first_accessed_at', null)
    .then(undefined, () => {})

  const destination = workerRole === 'dirty' ? `/worker/dirty/${staffId}` : `/worker/${staffId}`
  const response = NextResponse.redirect(new URL(destination, request.url))
  response.cookies.set(COOKIES.worker, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export const GET = withApiError(getHandler)
