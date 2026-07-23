'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 토스트 알림 — 대시보드 4곳에 각각 복사돼 있던 상태/타이머 로직.
 * 언마운트 시 타이머를 정리해 setState 누수를 막는다.
 */

export type ToastType = 'error' | 'success'
export interface Toast {
  msg: string
  type: ToastType
}

const DEFAULT_DURATION_MS = 3000

export function useToast(durationMs = DEFAULT_DURATION_MS) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const showToast = useCallback(
    (msg: string, type: ToastType = 'error') => {
      clear()
      setToast({ msg, type })
      timer.current = setTimeout(() => setToast(null), durationMs)
    },
    [clear, durationMs],
  )

  useEffect(() => clear, [clear])

  return { toast, showToast }
}
