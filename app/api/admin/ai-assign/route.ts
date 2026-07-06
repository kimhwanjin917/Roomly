import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type Recommendation = { roomId: string; staffId: string; reason: string }

// POST: 미배정 dirty 객실에 대한 AI 스마트 배정 추천
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ai_disabled', code: 'ai_disabled' }, { status: 501 })
  }

  const service = createServiceClient()

  const [roomsRes, assignmentsRes, staffRes] = await Promise.all([
    service
      .from('rooms')
      .select('id, number, floor, type, status, checkin_time')
      .eq('hotel_id', hotelId)
      .eq('status', 'dirty')
      .is('deleted_at', null)
      .order('floor')
      .order('number'),
    service
      .from('assignments')
      .select('room_id, staff_id')
      .is('completed_at', null)
      .is('cancelled_at', null),
    service
      .from('staff')
      .select('id, name')
      .eq('hotel_id', hotelId)
      .order('name'),
  ])

  const rooms = roomsRes.data ?? []
  const activeAssignments = assignmentsRes.data ?? []
  const staff = staffRes.data ?? []

  const assignedRoomIds = new Set(activeAssignments.map(a => a.room_id))
  const unassignedRooms = rooms.filter(r => !assignedRoomIds.has(r.id))

  if (unassignedRooms.length === 0 || staff.length === 0) {
    return NextResponse.json({ recommendations: [] })
  }

  // 직원별 현재 배정 수 (부하 균형 판단용)
  const loadByStaff = new Map<string, number>()
  for (const s of staff) loadByStaff.set(s.id, 0)
  for (const a of activeAssignments) {
    if (a.staff_id && loadByStaff.has(a.staff_id)) {
      loadByStaff.set(a.staff_id, (loadByStaff.get(a.staff_id) ?? 0) + 1)
    }
  }

  const roomsInfo = unassignedRooms.map(r => ({
    roomId: r.id,
    number: r.number,
    floor: r.floor,
    type: r.type,
    checkin_time: r.checkin_time,
  }))
  const staffInfo = staff.map(s => ({
    staffId: s.id,
    name: s.name,
    currentAssignments: loadByStaff.get(s.id) ?? 0,
  }))

  const prompt = [
    '호텔 하우스키핑 배정을 추천해주세요.',
    '',
    '기준 (우선순위 순):',
    '1. 체크인 시간이 임박한 객실을 먼저 배정',
    '2. 직원 간 배정 수(부하)를 균형 있게 분배',
    '3. 같은 직원은 가능한 같은 층/인접 층 객실을 맡아 층 이동 최소화',
    '',
    `미배정 객실: ${JSON.stringify(roomsInfo)}`,
    '',
    `직원 목록 (currentAssignments = 현재 진행 중 배정 수): ${JSON.stringify(staffInfo)}`,
    '',
    '모든 미배정 객실에 대해 [{"roomId": "...", "staffId": "...", "reason": "짧은 한국어 사유"}] 형식의 JSON 배열만 출력하세요.',
  ].join('\n')

  const anthropic = new Anthropic()

  let text = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: '반드시 JSON 배열만 출력. 다른 텍스트 금지.',
      messages: [{ role: 'user', content: prompt }],
    })
    const textBlock = message.content.find(b => b.type === 'text')
    text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
  } catch {
    return NextResponse.json({ error: 'ai_request_failed', code: 'ai_request_failed' }, { status: 502 })
  }

  // 코드 펜스가 붙어 오는 경우 방어적으로 제거
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'parse_failed', code: 'parse_failed' }, { status: 400 })
  }

  if (!Array.isArray(parsed)) {
    return NextResponse.json({ error: 'parse_failed', code: 'parse_failed' }, { status: 400 })
  }

  const validRoomIds = new Set(unassignedRooms.map(r => r.id))
  const validStaffIds = new Set(staff.map(s => s.id))

  const recommendations: Recommendation[] = []
  for (const item of parsed) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as Recommendation).roomId === 'string' &&
      typeof (item as Recommendation).staffId === 'string' &&
      validRoomIds.has((item as Recommendation).roomId) &&
      validStaffIds.has((item as Recommendation).staffId)
    ) {
      recommendations.push({
        roomId: (item as Recommendation).roomId,
        staffId: (item as Recommendation).staffId,
        reason: typeof (item as Recommendation).reason === 'string' ? (item as Recommendation).reason : '',
      })
    }
  }

  if (recommendations.length === 0) {
    return NextResponse.json({ error: 'parse_failed', code: 'parse_failed' }, { status: 400 })
  }

  return NextResponse.json({ recommendations })
}
