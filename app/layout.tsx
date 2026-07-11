import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://roomly.app'),
  title: 'Roomly — 호텔 객실 청소, 한 화면에서 실시간으로',
  description: '배정부터 완료 확인까지 전화 없이. QR로 직원이 바로 접속하고, 모든 객실 상태가 실시간 현황판에 나타납니다.',
  keywords: ['호텔 하우스키핑', '청소 관리', '객실 관리', '호텔 청소 앱', '하우스키핑 시스템'],
  authors: [{ name: 'Roomly' }],
  creator: 'Roomly',
  openGraph: {
    title: 'Roomly — 호텔 객실 청소, 한 화면에서 실시간으로',
    description: '호텔 하우스키핑 실시간 관리. QR 직원 접속과 실시간 현황판으로 전화 확인 없이 운영하세요.',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://roomly.app',
    siteName: 'Roomly',
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
    title: 'Roomly — 호텔 객실 청소, 한 화면에서 실시간으로',
    description: '호텔 하우스키핑 실시간 관리. QR 직원 접속과 실시간 현황판으로 전화 확인 없이 운영하세요.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Roomly',
  },
  icons: {
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
    canonical: 'https://roomly.app',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // T-100: 쿠키 기반 로케일 (i18n/request.ts) — 기본 'ko'
  const locale = await getLocale()
  return (
    <html lang={locale}>
      <body>
        {/* 메시지/로케일은 서버 요청 설정에서 자동 상속 (next-intl v4) */}
        <NextIntlClientProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
