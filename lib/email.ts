import { Resend } from 'resend'
import { ReactElement } from 'react'
import { createServiceClient } from '@/lib/supabase/server'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * email_logs 테이블에 발송 결과 기록 (T-083).
 * 로깅 실패가 발송 흐름을 깨지 않도록 절대 throw 하지 않는다.
 */
async function logEmail({
  hotelId,
  to,
  subject,
  status,
  errorMessage,
}: {
  hotelId?: string
  to: string
  subject: string
  status: 'sent' | 'failed'
  errorMessage?: string
}) {
  try {
    const service = createServiceClient()
    await service.from('email_logs').insert({
      hotel_id: hotelId ?? null,
      to_email: to,
      subject,
      status,
      error_message: errorMessage ?? null,
    })
  } catch {
    // 로깅 실패는 무시 (발송이 우선)
  }
}

export async function sendEmail({
  to,
  subject,
  react,
  hotelId,
}: {
  to: string
  subject: string
  react: ReactElement
  hotelId?: string
}) {
  // RESEND_API_KEY 없으면 조용히 스킵 (로컬 개발)
  if (!process.env.RESEND_API_KEY) return

  const resend = getResend()
  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Roomly <noreply@roomly.app>',
      to,
      subject,
      react,
    })
    if (error) {
      await logEmail({ hotelId, to, subject, status: 'failed', errorMessage: error.message })
      return
    }
    await logEmail({ hotelId, to, subject, status: 'sent' })
  } catch (e) {
    await logEmail({
      hotelId,
      to,
      subject,
      status: 'failed',
      errorMessage: e instanceof Error ? e.message : String(e),
    })
  }
}
