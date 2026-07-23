import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { ApiError, withApiError } from '@/lib/api-error'
import { addMonths } from '@/lib/date'
import WelcomeEmail from '@/emails/WelcomeEmail'

const TRIAL_MONTHS = 3
const MIN_PASSWORD_LENGTH = 8

/** Supabase가 이메일 중복을 알리는 방식이 버전마다 달라 메시지/코드를 함께 본다. */
function isDuplicateEmail(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  if (err.code === 'email_exists') return true
  const msg = err.message?.toLowerCase() ?? ''
  return msg.includes('already registered') || msg.includes('already exists') || msg.includes('email_exists')
}

async function postHandler(request: NextRequest) {
  const { hotelName, email, password } = await request.json()

  if (!hotelName?.trim() || !email?.trim() || !password) {
    throw ApiError.badRequest('모든 항목을 입력해주세요.')
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw ApiError.badRequest(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`)
  }

  const service = createServiceClient()
  const trialEndsAt = addMonths(new Date(), TRIAL_MONTHS)

  const { data: hotel, error: hotelErr } = await service
    .from('hotels')
    .insert({
      name: hotelName.trim(),
      subscription_plan: 'trial',
      trial_ends_at: trialEndsAt.toISOString(),
      admin_email: email.trim(),
    })
    .select('id')
    .single()

  if (hotelErr || !hotel) {
    console.error('[signup] hotels INSERT 실패', hotelErr)
    throw ApiError.internal('호텔 생성에 실패했습니다.')
  }

  // 계정 생성 실패 시 방금 만든 호텔을 되돌린다 (고아 레코드 방지)
  const { error: authErr } = await service.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    app_metadata: { hotel_id: hotel.id, role: 'admin' },
  })

  if (authErr) {
    console.error('[signup] auth.admin.createUser 실패', authErr)
    await service.from('hotels').delete().eq('id', hotel.id)

    if (isDuplicateEmail(authErr)) {
      throw ApiError.conflict('이미 사용 중인 이메일입니다.', 'email_exists')
    }
    throw ApiError.internal('계정 생성에 실패했습니다.')
  }

  // 환영 메일은 비차단 — 실패해도 가입은 성공 처리
  sendEmail({
    to: email.trim(),
    subject: 'Roomly에 오신 것을 환영합니다',
    react: WelcomeEmail({ hotelName: hotelName.trim() }),
    hotelId: hotel.id,
    template: 'welcome',
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
