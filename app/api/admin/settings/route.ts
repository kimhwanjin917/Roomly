import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

// GET: 호텔명 / 관리자 이메일 / 체크인 알림 기준 시간(분)
async function getHandler() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: hotel, error } = await service
    .from('hotels')
    .select('name, checkin_alert_minutes')
    .eq('id', hotelId)
    .single()

  if (error || !hotel) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })

  return NextResponse.json({
    hotelName: hotel.name,
    email: user.email ?? '',
    checkinAlertMinutes: hotel.checkin_alert_minutes ?? 120,
  })
}

// PATCH: { hotelName?, checkinAlertMinutes?, newPassword? }
async function patchHandler(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const body = await request.json() as {
    hotelName?: string
    checkinAlertMinutes?: number
    newPassword?: string
  }

  const updates: Record<string, unknown> = {}

  if (body.hotelName !== undefined) {
    const name = String(body.hotelName).trim()
    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'invalid_hotel_name', code: 'invalid_hotel_name' }, { status: 400 })
    }
    updates.name = name
  }

  if (body.checkinAlertMinutes !== undefined) {
    const minutes = Number(body.checkinAlertMinutes)
    if (!Number.isInteger(minutes) || minutes < 30 || minutes > 480) {
      return NextResponse.json({ error: 'invalid_alert_minutes', code: 'invalid_alert_minutes' }, { status: 400 })
    }
    updates.checkin_alert_minutes = minutes
  }

  if (Object.keys(updates).length > 0) {
    const service = createServiceClient()
    const { error } = await service.from('hotels').update(updates).eq('id', hotelId)
    if (error) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }

  if (body.newPassword !== undefined) {
    const pw = String(body.newPassword)
    if (pw.length < 8) {
      return NextResponse.json({ error: 'password_too_short', code: 'password_too_short' }, { status: 400 })
    }
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) {
      return NextResponse.json({ error: 'password_update_failed', code: 'password_update_failed' }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}

export const GET = withApiError(getHandler)
export const PATCH = withApiError(patchHandler)
