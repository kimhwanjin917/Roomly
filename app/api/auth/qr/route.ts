import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload
    const staffId = payload.app_metadata?.staff_id
    const hotelId = payload.app_metadata?.hotel_id
    const qrVersion = payload.app_metadata?.qr_version

    if (!staffId || !hotelId) return NextResponse.redirect(new URL('/login', request.url))

    const service = createServiceClient()
    const { data: staff } = await service
      .from('staff').select('qr_version').eq('id', staffId).single()

    if (!staff || staff.qr_version !== qrVersion) {
      return NextResponse.redirect(new URL('/login?error=qr_expired', request.url))
    }

    const workerRole = payload.app_metadata?.worker_role
    const dest = workerRole === 'dirty' ? `/worker/dirty/${staffId}` : `/worker/${staffId}`
    const response = NextResponse.redirect(new URL(dest, request.url))
    response.cookies.set('roomly_worker_session', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return response
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
