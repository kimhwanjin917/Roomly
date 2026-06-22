'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/admin',        label: '현황판',  icon: '🏠' },
  { href: '/admin/rooms',  label: '객실',    icon: '🛏️' },
  { href: '/admin/staff',  label: '직원',    icon: '👥' },
  { href: '/admin/stats',  label: '통계',    icon: '📊' },
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
      {/* PC (md 이상): 상단 가로 네비게이션 */}
      <header className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="font-semibold text-slate-800 text-sm">Roomly</span>
            </div>
            <nav className="flex gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-slate-100 text-slate-900 font-medium border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 모바일: 상단 간소 헤더 */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <span className="font-semibold text-slate-800 text-sm">Roomly</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 모바일: 하단 고정 탭바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-slate-200 flex">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              isActive(item.href)
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className={`text-[10px] font-medium ${
              isActive(item.href) ? 'text-blue-600' : 'text-slate-400'
            }`}>
              {item.label}
            </span>
            {isActive(item.href) && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-blue-600 rounded-t-full" />
            )}
          </Link>
        ))}
      </nav>
    </>
  )
}
