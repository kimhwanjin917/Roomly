import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { DEFAULT_CHECKIN_ALERT_MINUTES } from '@/lib/constants'

const MIN_ALERT_MINUTES = 30
const MAX_ALERT_MINUTES = 480
const MIN_PASSWORD_LENGTH = 8

// GET: 호텔명 / 관리자 이메일 / 체크인 알림 기준 시간(분)
async function getHandler() {
  const { hotelId, email, service } = await requireAdmin()

  const { data: hotel, error } = await service
    .from('hotels')
    .select('name, checkin_alert_minutes')
    .eq('id', hotelId)
    .single()

  if (error || !hotel) throw ApiError.internal()

  return NextResponse.json({
    hotelName: hotel.name,
    email: email ?? '',
    checkinAlertMinutes: hotel.checkin_alert_minutes ?? DEFAULT_CHECKIN_ALERT_MINUTES,
  })
}

// PATCH: { hotelName?, checkinAlertMinutes?, newPassword? }
async function patchHandler(request: NextRequest) {
  const { hotelId, supabase, service } = await requireAdmin()

  const body = await request.json() as {
    hotelName?: string
    checkinAlertMinutes?: number
    newPassword?: string
  }

  const updates: Record<string, unknown> = {}

  if (body.hotelName !== undefined) {
    const name = String(body.hotelName).trim()
    if (!name || name.length > 100) {
      throw ApiError.badRequest('호텔명은 1~100자로 입력해주세요.', 'invalid_hotel_name')
    }
    updates.name = name
  }

  if (body.checkinAlertMinutes !== undefined) {
    const minutes = Number(body.checkinAlertMinutes)
    if (!Number.isInteger(minutes) || minutes < MIN_ALERT_MINUTES || minutes > MAX_ALERT_MINUTES) {
      throw ApiError.badRequest(
        `알림 기준 시간은 ${MIN_ALERT_MINUTES}~${MAX_ALERT_MINUTES}분 사이여야 합니다.`,
        'invalid_alert_minutes',
      )
    }
    updates.checkin_alert_minutes = minutes
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await service.from('hotels').update(updates).eq('id', hotelId)
    if (error) throw ApiError.internal()
  }

  if (body.newPassword !== undefined) {
    const pw = String(body.newPassword)
    if (pw.length < MIN_PASSWORD_LENGTH) {
      throw ApiError.badRequest(
        `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
        'password_too_short',
      )
    }
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) throw ApiError.badRequest('비밀번호 변경에 실패했습니다.', 'password_update_failed')
  }

  return NextResponse.json({ ok: true })
}

export const GET = withApiError(getHandler)
export const PATCH = withApiError(patchHandler)
