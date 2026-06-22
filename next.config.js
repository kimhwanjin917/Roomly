const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    // 직원/게스트 페이지 — 캐시 즉시 응답, 백그라운드 갱신 (Realtime이 데이터 최신화 담당)
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
    // 관리자 페이지 — 캐시 즉시 응답, 백그라운드 갱신
    {
      urlPattern: /^\/admin.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'admin-pages',
        expiration: { maxEntries: 5, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // API GET 캐싱 — 캐시 즉시 응답, 백그라운드 갱신 (POST/DELETE는 캐싱 없음)
    {
      urlPattern: /^\/api\/worker\/assignments/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'worker-api',
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
      },
    },
    {
      urlPattern: /^\/api\/guest\/assignments/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'guest-api',
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
