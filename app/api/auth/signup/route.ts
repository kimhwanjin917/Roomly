import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import WelcomeEmail from '@/emails/WelcomeEmail'

export async function POST(request: NextRequest) {
  const { hotelName, email, password } = await request.json()

  if (!hotelName?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }

  const service = createServiceClient()

  // 이메일 중복 확인
  const { data: existing } = await service.auth.admin.listUsers()
  const duplicate = existing?.users.find(u => u.email === email.trim())
  if (duplicate) {
    return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 })
  }

  // 14일 무료체험 만료일 계산
  const trialExpiresAt = new Date()
  trialExpiresAt.setDate(trialExpiresAt.getDate() + 14)

  // 호텔 생성 (무료체험 세팅)
  const { data: hotel, error: hotelErr } = await service
    .from('hotels')
    .insert({
      name: hotelName.trim(),
      subscription_plan: 'trial',
      plan_type: 'trial',
      plan_expires_at: trialExpiresAt.toISOString(),
      room_limit: 10,
    })
    .select('id')
    .single()
  if (hotelErr || !hotel) {
    return NextResponse.json({ error: '호텔 생성에 실패했습니다.' }, { status: 500 })
  }

  // 관리자 계정 생성
  const { data: authUser, error: authErr } = await service.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    app_metadata: { hotel_id: hotel.id, role: 'admin' },
  })
  if (authErr || !authUser) {
    await service.from('hotels').delete().eq('id', hotel.id)
    return NextResponse.json({ error: '계정 생성에 실패했습니다.' }, { status: 500 })
  }

  sendEmail({
    to: email,
    subject: 'Roomly에 오신 것을 환영합니다',
    react: WelcomeEmail({ hotelName: hotelName }),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
