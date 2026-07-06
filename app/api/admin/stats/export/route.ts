import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized', code: 'unauthorized' }), { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return new Response(JSON.stringify({ error: 'forbidden', code: 'forbidden' }), { status: 403 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: 'invalid_date', code: 'invalid_date' }), { status: 400 })
  }

  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('completed_at, assigned_at, rooms!inner(number, floor, hotel_id), staff(name)')
    .eq('rooms.hotel_id', hotelId)
    .gte('completed_at', `${date}T00:00:00+09:00`)
    .lte('completed_at', `${date}T23:59:59+09:00`)
    .not('completed_at', 'is', null)

  if (error) return new Response(JSON.stringify({ error: 'server_error', code: 'server_error' }), { status: 500 })

  const rows = [['날짜', '직원', '객실', '층', '처리시간(분)']]
  for (const a of assignments ?? []) {
    const minutes = a.assigned_at && a.completed_at
      ? Math.round((new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / 60000)
      : ''
    rows.push([
      date,
      (a.staff as any)?.name ?? '게스트',
      (a.rooms as any)?.number ?? '',
      String((a.rooms as any)?.floor ?? ''),
      String(minutes),
    ])
  }

  const csv = '﻿' + rows.map(r => r.join(',')).join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=roomly_stats_${date}.csv`,
    },
  })
}
