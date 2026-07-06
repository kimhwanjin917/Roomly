// T-170: Sentry 클라이언트(브라우저) 설정
// DSN이 없으면 초기화하지 않음 (로컬 개발 등에서 비활성)
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  })
}
