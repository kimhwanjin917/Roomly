import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

  // 호텔 생성
  const { data: hotel, error: hotelErr } = await service
    .from('hotels')
    .insert({ name: hotelName.trim(), subscription_plan: 'starter' })
    .select('id')
    .single()
  if (hotelErr || !hotel) {
    return NextResponse.json({ error: '호텔 생성에 실패했습니다.' }, { status: 500 })
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
    // 계정 생성 실패 시 호텔도 롤백
    await service.from('hotels').delete().eq('id', hotel.id)
    return NextResponse.json({ error: '계정 생성에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
