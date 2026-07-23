'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Linear exact design tokens
const C = {
  bg:          '#0f1011',
  hover:       '#141516',
  active:      '#1c1d1e',
  border:      '#23252a',
  text:        '#8a8f98',
  textHover:   '#d0d6e0',
  textActive:  '#f7f8f8',
  iconDim:     '#4a4d54',
  section:     '#3d4046',
  accent:      '#5e6ad2',
} as const

const NAV_ITEMS = [
  {
    href: '/admin',
    label: '현황판',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 15, height: 15, flexShrink: 0 }}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
    iconActive: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 15, height: 15, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5V19h18v-8.5M3 19v-2h18v2M2 10.5h20M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      </svg>
    ),
    iconActive: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 15, height: 15, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5V19h18v-8.5M3 19v-2h18v2M2 10.5h20M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      </svg>
    ),
  },
  {
    href: '/admin/staff',
    label: '직원',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 15, height: 15, flexShrink: 0 }}>
        <circle cx="9" cy="7" r="3.5" />
        <path strokeLinecap="round" d="M2 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
        <path strokeLinecap="round" d="M17 8c1.66 0 3 1.34 3 3s-1.34 3-3 3" />
        <path strokeLinecap="round" d="M22 20c0-2.76-2.24-5-5-5" />
      </svg>
    ),
    iconActive: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 15, height: 15, flexShrink: 0 }}>
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 15, height: 15, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M4 20V14m0 6h4V14H4m4 6V9m0 11h4V9H8m4 11V4m0 16h4V4h-4" />
      </svg>
    ),
    iconActive: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
        <path fillRule="evenodd" clipRule="evenodd" d="M4 14a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H4ZM9 9a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H9ZM14 4a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-4Z" />
      </svg>
    ),
  },
]

const MORE_ITEMS = [
  {
    href: '/admin/supplies',
    label: '비품',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 15, height: 15, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    href: '/admin/maintenance',
    label: '유지보수',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 15, height: 15, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.665-1.787c.07-.052.149-.1.227-.143a4.5 4.5 0 0 1 5.004 1.108 4.5 4.5 0 0 1-6.67 5.77M11.42 15.17A4.5 4.5 0 0 1 6 9.75" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: '설정',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 15, height: 15, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
]

function SidebarItem({
  href,
  label,
  icon,
  iconActive,
  active,
}: {
  href: string
  label: string
  icon: React.ReactNode
  iconActive?: React.ReactNode
  active: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 8px',
        height: 28,
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '-0.01em',
        transition: 'background 120ms, color 120ms',
        textDecoration: 'none',
        color: active ? C.textActive : hovered ? C.textHover : C.text,
        background: active ? C.active : hovered ? C.hover : 'transparent',
        marginBottom: 1,
      }}
    >
      <span style={{ color: active ? C.textActive : hovered ? C.textHover : C.iconDim, display: 'flex' }}>
        {active && iconActive ? iconActive : icon}
      </span>
      {label}
    </Link>
  )
}

export default function AdminNav() {
  const [showMore, setShowMore] = useState(false)
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

  const moreActive = MORE_ITEMS.some(item => isActive(item.href))

  return (
    <>
      {/* PC (md+): Linear-style dark fixed sidebar */}
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 z-20"
        style={{ width: 220, background: C.bg, borderRight: `1px solid ${C.border}` }}
      >
        {/* Workspace header */}
        <div
          className="flex items-center shrink-0"
          style={{ height: 52, padding: '0 14px', gap: 10, borderBottom: `1px solid ${C.border}` }}
        >
          <span
            style={{
              width: 20, height: 20, borderRadius: 5,
              background: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}
          >
            R
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textActive, letterSpacing: '-0.01em' }}>
            Roomly
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '8px 8px 8px' }}>
          {NAV_ITEMS.map(item => (
            <SidebarItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              iconActive={item.iconActive}
              active={isActive(item.href)}
            />
          ))}

          {/* Section label */}
          <div style={{ padding: '16px 8px 6px' }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.section }}>
              관리
            </span>
          </div>

          {MORE_ITEMS.map(item => (
            <SidebarItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
        </nav>

        {/* Logout */}
        <LogoutButton onLogout={handleLogout} />
      </aside>

      {/* Mobile: Top header */}
      <header className="md:hidden bg-white sticky top-0 z-10" style={{ borderBottom: '1px solid #E8EAED' }}>
        <div className="flex items-center justify-between" style={{ padding: '0 20px', height: 48 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span
              style={{
                width: 22, height: 22, borderRadius: 5,
                background: C.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 10, fontWeight: 700,
              }}
            >
              R
            </span>
            <span style={{ fontWeight: 700, color: '#191919', fontSize: 14, letterSpacing: '-0.01em' }}>Roomly</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-[#B0B8C1] hover:text-[#6B7684] transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      {/* Mobile: Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white flex"
        style={{ borderTop: '1px solid #E8EAED', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center"
              style={{ paddingTop: 8, paddingBottom: 6, gap: 2 }}
            >
              <span style={{ color: active ? C.accent : '#B0B8C1' }}>
                {active ? item.iconActive ?? item.icon : item.icon}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '-0.01em', color: active ? C.accent : '#B0B8C1' }}>
                {item.label}
              </span>
            </Link>
          )
        })}
        <button
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center justify-center"
          style={{ paddingTop: 8, paddingBottom: 6, gap: 2 }}
        >
          <span style={{ color: moreActive ? C.accent : '#B0B8C1' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15 }}>
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '-0.01em', color: moreActive ? C.accent : '#B0B8C1' }}>
            더보기
          </span>
        </button>
      </nav>

      {/* Mobile: More bottom sheet */}
      {showMore && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white"
            style={{ borderRadius: '24px 24px 0 0', paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center" style={{ paddingTop: 12, paddingBottom: 8 }}>
              <div style={{ width: 40, height: 4, background: '#E8EAED', borderRadius: 9999 }} />
            </div>
            <div style={{ padding: '0 20px 32px' }}>
              <p className="text-xs font-bold text-[#B0B8C1] tracking-wider uppercase" style={{ marginBottom: 16 }}>관리</p>
              <div className="grid grid-cols-3" style={{ gap: 12 }}>
                {MORE_ITEMS.map(item => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMore(false)}
                      className="flex flex-col items-center"
                      style={{
                        gap: 8, padding: 16, borderRadius: 16,
                        background: active ? '#eef0fb' : '#F8F9FB',
                        color: active ? C.accent : '#6B7684',
                      }}
                    >
                      {item.icon}
                      <span style={{ fontSize: 12, fontWeight: 600, color: active ? C.accent : '#191919' }}>
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ padding: '8px 8px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
      <button
        onClick={onLogout}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '0 8px', height: 28,
          borderRadius: 6, fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
          transition: 'background 120ms, color 120ms',
          background: hovered ? C.hover : 'transparent',
          color: hovered ? C.textHover : C.text,
          border: 'none', cursor: 'pointer',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
          style={{ width: 15, height: 15, flexShrink: 0, color: hovered ? C.textHover : C.iconDim }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        로그아웃
      </button>
    </div>
  )
}
