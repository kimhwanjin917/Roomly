'use client'

import { useCallback, useEffect, useState } from 'react'
import { isNativeApp, subscribeNativePush, unsubscribeNativePush } from '@/lib/native-push'

/**
 * 푸시 알림 구독 상태 관리.
 *
 * 네이티브 앱(Capacitor)이면 FCM 경로를, 웹이면 Web Push(VAPID) 경로를 쓴다.
 * 지원하지 않는 환경에서는 'unsupported'가 되어 UI가 버튼을 숨긴다.
 */

export type PushState = 'idle' | 'subscribed' | 'denied' | 'unsupported'

export interface PushTarget {
  hotelId: string
  /** 직원 구독이면 staffId, 관리자 구독이면 isAdmin: true */
  staffId?: string
  isAdmin?: boolean
}

function webPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator
  )
}

export function usePush(target: PushTarget) {
  const [state, setState] = useState<PushState>('unsupported')
  const { hotelId, staffId, isAdmin } = target

  useEffect(() => {
    if (isNativeApp()) {
      setState('idle')
      return
    }
    if (!webPushSupported()) {
      setState('unsupported')
      return
    }
    setState(
      Notification.permission === 'granted' ? 'subscribed'
      : Notification.permission === 'denied' ? 'denied'
      : 'idle',
    )
  }, [])

  const subscribe = useCallback(async () => {
    if (isNativeApp()) {
      const ok = await subscribeNativePush({ hotelId, staffId, isAdmin })
      setState(ok ? 'subscribed' : 'denied')
      return
    }

    if (!webPushSupported()) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setState('denied')
      return
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON(), hotelId, staffId, isAdmin }),
    })

    setState(res.ok ? 'subscribed' : 'idle')
  }, [hotelId, staffId, isAdmin])

  const unsubscribe = useCallback(async () => {
    if (isNativeApp()) {
      await unsubscribeNativePush()
      setState('idle')
      return
    }

    if (!webPushSupported()) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {})
      await subscription.unsubscribe()
    }
    setState('idle')
  }, [])

  /** 버튼 하나로 구독/해지를 토글 */
  const toggle = useCallback(() => {
    if (state === 'idle') return subscribe()
    if (state === 'subscribed') return unsubscribe()
  }, [state, subscribe, unsubscribe])

  return { state, subscribe, unsubscribe, toggle }
}
