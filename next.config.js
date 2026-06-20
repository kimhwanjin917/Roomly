const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^\/worker\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'worker-pages',
        expiration: { maxEntries: 10, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
