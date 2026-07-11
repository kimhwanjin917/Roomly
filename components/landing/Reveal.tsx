'use client'

import { useEffect, useRef, useState } from 'react'
import type { ElementType, ReactNode } from 'react'

/**
 * 스크롤 리빌 래퍼.
 * 뷰포트에 들어오면 .is-visible을 붙여 globals.css의 .reveal 트랜지션을 발동시킨다.
 * 내부 자식에 .reveal-item을 주면 ".is-visible .reveal-item" 셀렉터로 스태거 연출이 가능.
 */
export default function Reveal({
  as,
  className = '',
  delay = 0,
  children,
}: {
  as?: ElementType
  className?: string
  delay?: number
  children: ReactNode
}) {
  const Tag = (as ?? 'div') as ElementType
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      // 요소 상단이 뷰포트 하단에서 12% 올라온 시점에 발동 — 너무 일찍/늦게 보이지 않게
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
