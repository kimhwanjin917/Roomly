import { Resend } from 'resend'
import { ReactElement } from 'react'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

type EmailOptions =
  | { to: string; subject: string; react: ReactElement; text?: never }
  | { to: string; subject: string; text: string; react?: never }

export async function sendEmail(options: EmailOptions) {
  if (!process.env.RESEND_API_KEY) return
  const resend = getResend()
  const { to, subject } = options
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'Roomly <noreply@roomly.app>',
    to,
    subject,
    ...(options.react ? { react: options.react } : { text: options.text }),
  })
}
