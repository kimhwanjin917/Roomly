import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://roomly.vercel.app'),
  title: {
    default: 'Roomly — 호텔 하우스키핑 실시간 관리',
    template: '%s | Roomly',
  },
  description: '단톡방을 대체하는 호텔 하우스키핑 실시간 관리 솔루션. 객실 배정·청소 현황 실시간 추적·직원 QR 접속·체크인 알림까지 한 번에.',
  keywords: ['호텔 하우스키핑', '하우스키핑 관리', '객실 관리', '호텔 관리 시스템', '청소 관리', '호텔 소프트웨어', 'PMS', 'housekeeping management'],
  authors: [{ name: 'Roomly' }],
  creator: 'Roomly',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://roomly.vercel.app',
    siteName: 'Roomly',
    title: 'Roomly — 호텔 하우스키핑 실시간 관리',
    description: '단톡방을 대체하는 호텔 하우스키핑 실시간 관리 솔루션.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Roomly 호텔 하우스키핑 관리',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roomly — 호텔 하우스키핑 실시간 관리',
    description: '단톡방을 대체하는 호텔 하우스키핑 실시간 관리 솔루션.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Roomly',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: 'https://roomly.vercel.app',
  },
}

export const viewport: Viewport = {
  themeColor: '#3182F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
