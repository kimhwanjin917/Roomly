import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * AI-01: AI 운영 인사이트 (스트리밍)
 * 관리자 세션 확인 → 최근 7일 운영 데이터 집계 → Claude Haiku 스트리밍 응답.
 * ANTHROPIC_API_KEY 없으면 501 { error: 'ai_disabled' }.
 */
export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ai_disabled' }, { status: 501 })
  }

  // 관리자 세션 확인
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const hotelId = user?.app_metadata?.hotel_id as string | undefined
  if (!user || !hotelId || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 최근 7일 데이터 집계 (KST 기준)
  const service = createServiceClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [completedRes, delayRes] = await Promise.all([
    service
      .from('assignments')
      .select('staff_id, assigned_at, completed_at, staff:staff_id(name), rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotelId)
      .gte('completed_at', since)
      .not('completed_at', 'is', null),
    service
      .from('room_logs')
      .select('room_id, changed_at, rooms!inner(hotel_id, number)')
      .eq('rooms.hotel_id', hotelId)
      .eq('alert_type', 'urgent_2h')
      .gte('changed_at', since),
  ])

  const assignments = completedRes.data ?? []

  // 일별 완료 수 (KST 날짜, 요일 포함)
  const dailyCompleted: Record<string, number> = {}
  for (const a of assignments) {
    if (!a.completed_at) continue
    const kst = new Date(new Date(a.completed_at).getTime() + 9 * 60 * 60 * 1000)
    const key = `${kst.toISOString().slice(0, 10)}(${'일월화수목금토'[kst.getUTCDay()]})`
    dailyCompleted[key] = (dailyCompleted[key] ?? 0) + 1
  }

  // 직원별 평균 처리시간(분)
  const staffMap = new Map<string, { name: string; count: number; totalMin: number }>()
  for (const a of assignments) {
    if (!a.staff_id || !a.assigned_at || !a.completed_at) continue
    const name = (a.staff as { name: string }[] | null)?.[0]?.name ?? '이름없음'
    const entry = staffMap.get(a.staff_id) ?? { name, count: 0, totalMin: 0 }
    entry.count++
    entry.totalMin +=
      (new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / 60000
    staffMap.set(a.staff_id, entry)
  }
  const staffStats = Array.from(staffMap.values()).map((s) => ({
    이름: s.name,
    완료건수: s.count,
    평균처리분: Math.round(s.totalMin / s.count),
  }))

  // 딜레이 발생 방 (체크인 2시간 전 미완료 알림이 발생한 객실)
  const delayedRooms = (delayRes.data ?? []).map(
    (d) => (d.rooms as unknown as { number: string } | null)?.number ?? '?'
  )

  const dataJson = JSON.stringify({
    일별완료수: dailyCompleted,
    직원별평균처리시간: staffStats,
    딜레이발생방: delayedRooms,
  })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const stream = anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `다음 호텔 하우스키핑 데이터를 분석해 관리자에게 유용한 인사이트를 1-3문장으로 제시. 데이터: ${dataJson}. 관점: 병목, 우수 직원, 요일별 패턴.`,
      },
    ],
  })

  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
