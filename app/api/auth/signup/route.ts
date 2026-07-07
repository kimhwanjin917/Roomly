import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import WelcomeEmail from '@/emails/WelcomeEmail'
import { withApiError } from '@/lib/api-error'

const TRIAL_DAYS = 90  // 3개월 무료 체험

async function postHandler(request: NextRequest) {
  const { hotelName, email, password, agreedTerms, agreedMarketing } = await request.json()

  if (!hotelName?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.', code: 'missing_fields' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.', code: 'password_too_short' }, { status: 400 })
  }
  if (agreedTerms !== true) {
    return NextResponse.json({ error: '필수 약관에 동의해주세요.', code: 'terms_required' }, { status: 400 })
  }
  // agreedMarketing: 수신은 하되 저장은 추후 구현 (마케팅 수신 동의 컬럼 추가 시 hotels INSERT에 반영)
  void agreedMarketing

  const service = createServiceClient()

  // 이메일 중복 확인
  const { data: existing } = await service.auth.admin.listUsers()
  const duplicate = existing?.users.find(u => u.email === email.trim())
  if (duplicate) {
    return NextResponse.json({ error: '이미 사용 중인 이메일입니다.', code: 'email_in_use' }, { status: 409 })
  }

  // 호텔 생성 — 가입 즉시 3개월 무료 체험 시작
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: hotel, error: hotelErr } = await service
    .from('hotels')
    .insert({
      name: hotelName.trim(),
      subscription_plan: 'trial',
      trial_ends_at: trialEndsAt,
      agreed_terms_at: new Date().toISOString(),  // 011_settings.sql에서 추가되는 컬럼
    })
    .select('id')
    .single()
  if (hotelErr || !hotel) {
    return NextResponse.json({ error: '호텔 생성에 실패했습니다.', code: 'hotel_create_failed' }, { status: 500 })
  }

  // 관리자 계정 생성 + app_metadata 설정
  const { data: authUser, error: authErr } = await service.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    app_metadata: {
      hotel_id: hotel.id,
      role: 'admin',
    },
  })
  if (authErr || !authUser) {
    await service.from('hotels').delete().eq('id', hotel.id)
    return NextResponse.json({ error: '계정 생성에 실패했습니다.', code: 'account_create_failed' }, { status: 500 })
  }

  // 비차단 환영 이메일 발송
  sendEmail({
    to: email,
    subject: 'Roomly에 오신 것을 환영합니다',
    react: WelcomeEmail({ hotelName: hotelName }),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
