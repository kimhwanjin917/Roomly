import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { ApiError, withApiError } from '@/lib/api-error'

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'ouuoups@gmail.com'

async function postHandler(request: NextRequest) {
  const { name, email, message } = await request.json()

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    throw ApiError.badRequest('모든 항목을 입력해주세요.')
  }

  const ok = await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[Roomly 문의] ${name.trim()}`,
    text: `이름: ${name.trim()}\n이메일: ${email.trim()}\n\n${message.trim()}`,
    template: 'contact',
  })

  if (!ok) throw ApiError.internal('전송에 실패했습니다. 다시 시도해주세요.')

  return NextResponse.json({ ok: true })
}

export const POST = withApiError(postHandler)
