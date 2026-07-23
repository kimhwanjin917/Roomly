const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      urlPattern: /^\/worker\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'worker-pages',
        expiration: { maxEntries: 10, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^\/guest$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'guest-page',
        expiration: { maxEntries: 1, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^\/admin.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'admin-pages',
        expiration: { maxEntries: 5, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^\/api\/worker\/assignments/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'worker-api',
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
        networkTimeoutSeconds: 5,
      },
    },
    {
      urlPattern: /^\/api\/guest\/assignments/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'guest-api',
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
        networkTimeoutSeconds: 5,
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['web-push', 'resend', '@react-email/components'],
    // T-170: instrumentation.ts에서 Sentry 서버/엣지 설정 로드
    instrumentationHook: true,
  },
}

// T-100: next-intl 플러그인 — 쿠키 기반 로케일 (i18n/request.ts)
const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// T-170: Sentry wrap — 기존 withPWA 유지, 가장 바깥에서 감싼다.
// SENTRY_AUTH_TOKEN이 없으면 소스맵 업로드는 자동 스킵되고 빌드는 정상 진행.
const { withSentryConfig } = require('@sentry/nextjs')

// 래핑 순서: nextConfig → next-intl → PWA → Sentry(최외곽)
module.exports = withSentryConfig(withPWA(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
})
