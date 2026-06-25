'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  {
    href: '/admin',
    label: '현황판',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/admin/rooms',
    label: '객실',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5V19h18v-8.5M3 19v-2h18v2M2 10.5h20M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5V19h18v-8.5M3 19v-2h18v2M2 10.5h20M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      </svg>
    ),
  },
  {
    href: '/admin/staff',
    label: '직원',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <circle cx="9" cy="7" r="3.5" />
        <path strokeLinecap="round" d="M2 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
        <path strokeLinecap="round" d="M17 8c1.66 0 3 1.34 3 3s-1.34 3-3 3" />
        <path strokeLinecap="round" d="M22 20c0-2.76-2.24-5-5-5" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
        <circle cx="9" cy="7" r="3.5" />
        <path strokeLinecap="round" d="M2 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
        <path strokeLinecap="round" d="M17 8c1.66 0 3 1.34 3 3s-1.34 3-3 3" />
        <path strokeLinecap="round" d="M22 20c0-2.76-2.24-5-5-5" />
      </svg>
    ),
  },
  {
    href: '/admin/stats',
    label: '통계',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M4 20V14m0 6h4V14H4m4 6V9m0 11h4V9H8m4 11V4m0 16h4V4h-4" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" clipRule="evenodd" d="M4 14a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H4ZM9 9a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H9ZM14 4a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-4Z" />
      </svg>
    ),
  },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* PC (md 이상): 상단 네비게이션 */}
      <header className="hidden md:block bg-white sticky top-0 z-10" style={{ borderBottom: '1px solid #E8EAED' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Roomly" className="w-7 h-7 shrink-0" />
              <span className="font-bold text-[#191919] text-sm tracking-tight">Roomly</span>
            </div>
            <nav className="flex gap-1">
              {NAV_ITEMS.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#EBF3FF] text-toss-blue'
                        : 'text-[#6B7684] hover:text-[#191919] hover:bg-[#F2F4F6]'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-[#B0B8C1] hover:text-[#6B7684] transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 모바일: 상단 미니 헤더 */}
      <header className="md:hidden bg-white sticky top-0 z-10" style={{ borderBottom: '1px solid #E8EAED' }}>
        <div className="px-5 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Roomly" className="w-6 h-6 shrink-0" />
            <span className="font-bold text-[#191919] text-sm tracking-tight">Roomly</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-[#B0B8C1] hover:text-[#6B7684] transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 모바일: 하단 탭바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white flex" style={{ borderTop: '1px solid #E8EAED', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-colors"
            >
              <span className={active ? 'text-toss-blue' : 'text-[#B0B8C1]'}>
                {active ? item.iconFilled : item.icon}
              </span>
              <span className={`text-[10px] font-semibold tracking-tight ${active ? 'text-toss-blue' : 'text-[#B0B8C1]'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
