'use client'

import { useEffect, useState } from 'react'
import { createClient, createClientWithToken } from '@/lib/supabase/client'

/**
 * 실시간 갱신 관련 훅 — 대시보드 4곳에 복제돼 있던 타이머/네트워크/구독 로직.
 */

/** 주기적으로 갱신되는 현재 시각 (긴급 판정 재계산용) */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}

/**
 * 온라인/오프라인 상태. 오프라인 → 온라인 복귀 시 refetch를 한 번 호출한다.
 * (PWA로 설치된 현장 단말이 터널·엘리베이터에서 자주 끊긴다)
 */
export function useOnlineStatus(onReconnect?: () => void): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      onReconnect?.()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [onReconnect])

  return isOnline
}

export type RealtimeStatus = 'connected' | 'disconnected'

/**
 * 지정한 테이블의 변경을 구독하고 변경 시 refetch를 호출한다.
 * `token`을 주면 워커/게스트 JWT로 인증된 클라이언트를 쓴다.
 */
export function useRealtimeRefetch(options: {
  channel: string
  tables: readonly string[]
  onChange: () => void
  token?: string
}): RealtimeStatus {
  const { channel, tables, onChange, token } = options
  const [status, setStatus] = useState<RealtimeStatus>('connected')
  const tableKey = tables.join(',')

  useEffect(() => {
    const supabase = token ? createClientWithToken(token) : createClient()
    let ch = supabase.channel(channel)

    for (const table of tableKey.split(',')) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    }

    ch.subscribe(state => {
      if (state === 'SUBSCRIBED') setStatus('connected')
      if (state === 'CLOSED' || state === 'CHANNEL_ERROR') setStatus('disconnected')
    })

    return () => { supabase.removeChannel(ch) }
  }, [channel, tableKey, onChange, token])

  return status
}
