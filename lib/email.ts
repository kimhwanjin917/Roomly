import { Resend } from 'resend'
import { ReactElement } from 'react'
import { createServiceClient } from '@/lib/supabase/server'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

type EmailOptions =
  | { to: string; subject: string; react: ReactElement; text?: never; hotelId?: string; template?: string }
  | { to: string; subject: string; text: string; react?: never; hotelId?: string; template?: string }

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, hotelId, template } = options
  if (!process.env.RESEND_API_KEY) return false
  const resend = getResend()

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Roomly <noreply@roomly.app>',
      to,
      subject,
      ...(options.react ? { react: options.react } : { text: options.text }),
    })

    if (hotelId) {
      const service = createServiceClient()
      void (async () => {
        try { await service.from('email_logs').insert({ hotel_id: hotelId, to_email: to, template: template ?? 'generic', status: 'sent', sent_at: new Date().toISOString() }) } catch {}
      })()
    }
    return true
  } catch (err) {
    if (hotelId) {
      const service = createServiceClient()
      void (async () => {
        try { await service.from('email_logs').insert({ hotel_id: hotelId, to_email: to, template: template ?? 'generic', status: 'failed', error_msg: err instanceof Error ? err.message : 'Unknown error', sent_at: new Date().toISOString() }) } catch {}
      })()
    }
    return false
  }
}
