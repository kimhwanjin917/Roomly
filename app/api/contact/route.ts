import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json()

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
  }

  const ok = await sendEmail({
    to: 'ouuoups@gmail.com',
    subject: `[Roomly 문의] ${name}`,
    text: `이름: ${name}\n이메일: ${email}\n\n${message}`,
  })

  if (!ok) return NextResponse.json({ error: '전송에 실패했습니다. 다시 시도해주세요.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
