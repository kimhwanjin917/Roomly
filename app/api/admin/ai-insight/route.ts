import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: '호텔 정보 없음' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI 기능을 사용하려면 ANTHROPIC_API_KEY 환경변수가 필요합니다.' }, { status: 503 })
  }

  const service = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const { data: logs } = await service
    .from('room_logs')
    .select('status, created_at, rooms(number, floor, type)')
    .eq('hotel_id', hotelId)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: rooms } = await service
    .from('rooms')
    .select('status')
    .eq('hotel_id', hotelId)
    .is('deleted_at', null)

  const summary = {
    totalRooms: rooms?.length ?? 0,
    byStatus: rooms?.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1; return acc
    }, {}) ?? {},
    recentLogs: logs?.length ?? 0,
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `호텔 하우스키핑 데이터를 분석해서 한국어로 3가지 인사이트를 bullet point로 제공해주세요. 각 항목은 1-2문장으로 짧게.

데이터:
- 총 객실: ${summary.totalRooms}개
- 현재 상태: ${JSON.stringify(summary.byStatus)}
- 최근 7일 이벤트: ${summary.recentLogs}건

JSON 형식으로만 응답: {"insights": ["인사이트1", "인사이트2", "인사이트3"]}`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ insights: [text] })
  }
}
