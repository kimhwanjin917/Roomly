// T-170: Next.js instrumentation hook
// @sentry/nextjs v8+ 에서는 서버/엣지 Sentry 설정을 여기서 로드해야 한다.
// (next.config.js의 experimental.instrumentationHook = true 필요)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
