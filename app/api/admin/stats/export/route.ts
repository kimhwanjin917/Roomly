import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ApiError, withApiError } from '@/lib/api-error'
import { kstDayRange, kstDateStr } from '@/lib/date'

// 세션 쿠키/헤더를 읽는 라우트 — 빌드 시 정적 프리렌더를 시도하지 않도록 명시한다
export const dynamic = 'force-dynamic'


/**
 * 객실 상태 변경 이력 CSV 내보내기.
 *
 * 쿼리: `?date=YYYY-MM-DD` (하루) 또는 `?from=...&to=...` (기간, KST 기준).
 * 호텔은 세션에서만 결정된다 — 쿼리 파라미터로 다른 호텔을 지정할 수 없다.
 */

const HEADER = ['일시', '호수', '층', '타입', '상태', '변경자', '메모'] as const

interface LogRow {
  status: string | null
  changed_by: string | null
  memo: string | null
  changed_at: string | null
  rooms: { number: string; floor: number; type: string } | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

async function getHandler(request: NextRequest) {
  const { hotelId, service } = await requireAdmin()

  const params = request.nextUrl.searchParams
  const date = params.get('date')
  const from = date ?? params.get('from')
  const to = date ?? params.get('to')

  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    throw ApiError.badRequest('조회할 날짜를 지정해주세요. (date 또는 from/to, YYYY-MM-DD)')
  }

  const { start } = kstDayRange(from)
  const { end } = kstDayRange(to)

  const { data, error } = await service
    .from('room_logs')
    .select('status, changed_by, memo, changed_at, rooms!inner(hotel_id, number, floor, type)')
    .eq('rooms.hotel_id', hotelId)
    .gte('changed_at', start)
    .lte('changed_at', end)
    .order('changed_at', { ascending: true })

  if (error) {
    console.error('[stats/export]', error)
    throw ApiError.internal()
  }

  const logs = (data ?? []) as unknown as LogRow[]
  const rows = logs.map(l => [
    l.changed_at ? new Date(l.changed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '',
    l.rooms?.number ?? '',
    l.rooms?.floor ?? '',
    l.rooms?.type ?? '',
    l.status ?? '',
    l.changed_by ?? '',
    l.memo ?? '',
  ])

  // 선행 BOM — Excel이 UTF-8로 인식하게 한다
  const csv = '﻿' + [HEADER, ...rows].map(row => row.map(csvCell).join(',')).join('\n')
  const filename = from === to ? `roomly-${from}` : `roomly-${from}_${to}`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}

export const GET = withApiError(getHandler)
