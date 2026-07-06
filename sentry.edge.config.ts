// T-170: Sentry 엣지(미들웨어 등 Edge 런타임) 설정
// DSN이 없으면 초기화하지 않음 (로컬 개발 등에서 비활성)
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  })
}
