import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const hotelId = searchParams.get('hotelId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!hotelId || !from || !to) {
    return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })
  }

  const supabase = getAdmin()

  const { data: logs } = await supabase
    .from('room_logs')
    .select('id, room_id, status, changed_by, memo, created_at, rooms(number, floor, type)')
    .eq('hotel_id', hotelId)
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59Z')
    .order('created_at', { ascending: true })

  if (!logs) return NextResponse.json({ error: 'DB 오류' }, { status: 500 })

  const rows = logs.map((l: any) => [
    l.created_at?.slice(0, 16) ?? '',
    l.rooms?.number ?? '',
    l.rooms?.floor ?? '',
    l.rooms?.type ?? '',
    l.status ?? '',
    l.changed_by ?? '',
    l.memo ?? '',
  ])

  const header = ['일시', '호수', '층', '타입', '상태', '변경자', '메모']
  const csv = [header, ...rows]
    .map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="roomly-stats-${from}-${to}.csv"`,
    },
  })
}
