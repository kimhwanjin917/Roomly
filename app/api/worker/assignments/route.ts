import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'
import { withApiError } from '@/lib/api-error'

async function getHandler(request: NextRequest) {
  const sessionCookie = request.cookies.get('roomly_worker_session')
  if (!sessionCookie) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(sessionCookie.value, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const staffId = payload.app_metadata?.staff_id as string
  const service = createServiceClient()

  const { data } = await service
    .from('assignments')
    .select('id, assigned_at, rooms(id, number, floor, type, status, checkin_time)')
    .eq('staff_id', staffId)
    .is('completed_at', null)
    .is('cancelled_at', null)

  return NextResponse.json(data ?? [])
}

export const GET = withApiError(getHandler)
