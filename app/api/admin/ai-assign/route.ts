import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: '호텔 정보 없음' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI 기능을 사용하려면 ANTHROPIC_API_KEY 환경변수가 필요합니다.' }, { status: 503 })
  }

  const service = createServiceClient()

  const [{ data: rooms }, { data: staff }, { data: assignments }] = await Promise.all([
    service.from('rooms').select('id, number, floor, type, status, checkin_time').eq('hotel_id', hotelId).is('deleted_at', null).eq('status', 'dirty'),
    service.from('staff').select('id, name, role').eq('hotel_id', hotelId),
    service.from('assignments').select('room_id, staff_id, is_guest').is('completed_at', null).is('cancelled_at', null),
  ])

  if (!rooms?.length) return NextResponse.json({ recommendations: [] })

  const assignedRoomIds = new Set(assignments?.map(a => a.room_id) ?? [])
  const unassigned = rooms.filter(r => !assignedRoomIds.has(r.id))

  if (!unassigned.length) return NextResponse.json({ recommendations: [], message: '배정 대상 객실 없음' })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `호텔 하우스키핑 배정을 최적화해주세요. JSON으로만 응답.

미배정 객실: ${JSON.stringify(unassigned.map(r => ({ id: r.id, number: r.number, floor: r.floor, checkin: r.checkin_time })))}
직원 목록: ${JSON.stringify(staff?.map(s => ({ id: s.id, name: s.name, role: s.role })))}

응답 형식: {"recommendations": [{"roomId": "...", "staffId": "...", "reason": "한 줄 이유"}]}
체크인이 빠른 방 우선, 같은 층 직원 우선 배정.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ recommendations: [], raw: text })
  }
}
