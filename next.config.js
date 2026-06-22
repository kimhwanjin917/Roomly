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
