import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Roomly',
  description: '호텔 하우스키핑 실시간 관리',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
