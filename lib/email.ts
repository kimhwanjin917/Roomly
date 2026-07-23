import { Resend } from 'resend'
import { ReactElement } from 'react'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * 트랜잭션 메일 발송 — Resend 래퍼.
 *
 * RESEND_API_KEY가 없으면 조용히 false를 돌려주고, 발송 실패도 예외를 던지지 않는다
 * (메일은 부가 기능이라 본 흐름을 막지 않는다).
 * hotelId를 주면 email_logs에 성공/실패를 남긴다. subject도 함께 기록해야
 * trial-ending 크론의 "오늘 같은 제목 이미 발송" 중복 방지가 동작한다.
 */

type EmailBase = {
  to: string
  subject: string
  /** email_logs에 남길 템플릿 식별자 */
  template?: string
  /** 지정 시 email_logs에 발송 기록을 남긴다 */
  hotelId?: string
}

export type EmailOptions =
  | (EmailBase & { react: ReactElement; text?: never })
  | (EmailBase & { text: string; react?: never })

async function logEmail(params: {
  hotelId: string
  to: string
  subject: string
  template: string
  status: 'sent' | 'failed'
  error?: unknown
}): Promise<void> {
  try {
    const now = new Date().toISOString()
    await createServiceClient().from('email_logs').insert({
      hotel_id: params.hotelId,
      to_email: params.to,
      subject: params.subject,
      template: params.template,
      status: params.status,
      error_msg:
        params.error instanceof Error ? params.error.message
        : params.error ? String(params.error)
        : null,
      sent_at: now,
      created_at: now,
    })
  } catch (err) {
    // 로깅 실패는 발송 결과에 영향을 주지 않는다
    console.error('[email] email_logs 기록 실패', err)
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, hotelId, template = 'generic' } = options

  if (!process.env.RESEND_API_KEY) return false

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Roomly <noreply@roomly.app>',
      to,
      subject,
      ...(options.react ? { react: options.react } : { text: options.text }),
    })

    if (hotelId) await logEmail({ hotelId, to, subject, template, status: 'sent' })
    return true
  } catch (err) {
    console.error('[email] 발송 실패', subject, err)
    if (hotelId) await logEmail({ hotelId, to, subject, template, status: 'failed', error: err })
    return false
  }
}
