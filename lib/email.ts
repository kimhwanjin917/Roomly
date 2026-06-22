import { Resend } from 'resend'
import { ReactElement } from 'react'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: ReactElement
}) {
  if (!process.env.RESEND_API_KEY) return
  const resend = getResend()
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'Roomly <noreply@roomly.app>',
    to,
    subject,
    react,
  })
}
