'use client'

import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isNativeApp, getNativePushPermission, hasNativeFcmToken, subscribeNativePush, unsubscribeNativePush } from '@/lib/native-push'

const BoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/>
    <path d="M12 22V12"/>
  </svg>
)

const WrenchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
)

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const NAV_ITEMS: { href: string; label: string; icon: string | ReactNode }[] = [
  { href: '/admin',             label: '현황판',   icon: '🏠' },
  { href: '/admin/rooms',       label: '객실',     icon: '🛏️' },
  { href: '/admin/staff',       label: '직원',     icon: '👥' },
  { href: '/admin/stats',       label: '통계',     icon: '📊' },
  { href: '/admin/supplies',    label: '비품',     icon: <BoxIcon /> },
  { href: '/admin/maintenance', label: '유지보수', icon: <WrenchIcon /> },
  { href: '/admin/settings',    label: '설정',     icon: <SettingsIcon /> },
]

type PushState = 'idle' | 'subscribed' | 'denied' | 'unsupported'

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [openMaintenanceCount, setOpenMaintenanceCount] = useState(0)
  const [pushState, setPushState] = useState<PushState>('unsupported')
  const [hotelId, setHotelId] = useState('')

  useEffect(() => {
    fetch('/api/admin/maintenance/count')
      .then(r => r.json())
      .then(d => setOpenMaintenanceCount(d.count ?? 0))
      .catch(() => {})
  }, [])

  // T-014: 관리자 푸시 알림 (WorkerDashboard의 PushState 패턴 재사용)
  useEffect(() => {
    // T-205: 네이티브 앱은 Web Push 대신 FCM 경로
    if (isNativeApp()) {
      getNativePushPermission().then(perm => {
        if (perm === 'denied') setPushState('denied')
        else if (perm === 'granted' && hasNativeFcmToken()) setPushState('subscribed')
        else setPushState('idle')
      }).catch(() => setPushState('unsupported'))
    } else if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setPushState('unsupported')
      return
    } else if (Notification.permission === 'granted') {
      setPushState('subscribed')
    } else if (Notification.permission === 'denied') {
      setPushState('denied')
    } else {
      setPushState('idle')
    }
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.app_metadata?.hotel_id) setHotelId(user.app_metadata.hotel_id as string)
    })
  }, [])

  async function subscribePush() {
    try {
      if (isNativeApp()) {
        const ok = await subscribeNativePush({ hotelId, isAdmin: true })
        setPushState(ok ? 'subscribed' : 'denied')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setPushState('denied'); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), hotelId, isAdmin: true }),
      })
      setPushState('subscribed')
    } catch {
      // 구독 실패 시 상태 유지
    }
  }

  async function unsubscribePush() {
    try {
      if (isNativeApp()) {
        await unsubscribeNativePush()
        setPushState('idle')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setPushState('idle')
    } catch {
      // 해제 실패 시 상태 유지
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const bellButton = pushState !== 'unsupported' && (
    <div className="relative">
      <button
        onClick={pushState === 'idle' ? subscribePush : pushState === 'subscribed' ? unsubscribePush : undefined}
        disabled={pushState === 'denied'}
        title={
          pushState === 'denied' ? '브라우저 알림이 차단됨' :
          pushState === 'subscribed' ? '체크인 긴급 알림 켜짐 (클릭하여 끄기)' :
          '체크인 긴급 알림 받기'
        }
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
          pushState === 'idle' ? 'text-slate-400 hover:bg-slate-100' :
          pushState === 'subscribed' ? 'text-slate-700 hover:bg-slate-100' :
          'text-red-400 cursor-default'
        }`}
      >
        {pushState === 'subscribed' ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z" />
            <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" clipRule="evenodd" />
          </svg>
        ) : pushState === 'denied' ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        )}
      </button>
      {pushState === 'subscribed' && (
        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
      )}
    </div>
  )

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
                  <span className="relative inline-flex items-center gap-1">
                    {item.label}
                    {item.href === '/admin/maintenance' && openMaintenanceCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                        {openMaintenanceCount}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {bellButton}
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
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
          <div className="flex items-center gap-1">
            {bellButton}
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
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
            <span className="text-lg leading-none relative">
              {item.icon}
              {item.href === '/admin/maintenance' && openMaintenanceCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {openMaintenanceCount > 9 ? '9+' : openMaintenanceCount}
                </span>
              )}
            </span>
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
