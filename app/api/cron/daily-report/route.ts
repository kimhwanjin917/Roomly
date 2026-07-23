import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { DailyReportEmail } from '@/emails/DailyReportEmail'
import Anthropic from '@anthropic-ai/sdk'

async function generateAISummary(params: {
  totalRooms: number
  completed: number
  completionRate: number
  staffStats: { name: string; completed: number; avgMinutes: number | null }[]
}): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const staffDesc = params.staffStats.length > 0
      ? params.staffStats.map(s => `${s.name}: ${s.completed}건${s.avgMinutes ? ` (평균 ${s.avgMinutes}분)` : ''}`).join(', ')
      : '데이터 없음'

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `호텔 하우스키핑 일일 실적 데이터를 분석하여 간결한 인사이트를 한국어로 2~3문장 이내로 제공해주세요. 수치를 언급하되 격려와 개선점을 함께 포함해주세요.

데이터:
- 전체 객실: ${params.totalRooms}개
- 완료: ${params.completed}개 (완료율 ${params.completionRate}%)
- 직원별 실적: ${staffDesc}`,
        }
      ],
    })
    const content = message.content[0]
    return content.type === 'text' ? content.text : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const kstNow = new Date(now.getTime() + kstOffset)
  const yesterday = new Date(kstNow)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().slice(0, 10)
  const dayStart = `${dateStr}T00:00:00+09:00`
  const dayEnd = `${dateStr}T23:59:59+09:00`

  const { data: hotels } = await service.from('hotels').select('id, name, admin_email')
  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const hotel of hotels) {
    if (!hotel.admin_email) continue

    const { count: totalRooms } = await service
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotel.id)
      .is('deleted_at', null)

    const { data: assignments } = await service
      .from('assignments')
      .select('staff_id, assigned_at, completed_at, staff:staff_id(name), rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotel.id)
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd)
      .not('completed_at', 'is', null)

    const completed = assignments?.length ?? 0
    const completionRate = totalRooms ? Math.round((completed / totalRooms) * 100) : 0

    const staffMap = new Map<string, { name: string; count: number; totalMinutes: number }>()
    for (const a of assignments ?? []) {
      const staffId = a.staff_id ?? 'guest'
      const staffName = (a.staff as unknown as { name: string } | null)?.name ?? '게스트'
      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, { name: staffName, count: 0, totalMinutes: 0 })
      }
      const s = staffMap.get(staffId)!
      s.count++
      if (a.completed_at && a.assigned_at) {
        s.totalMinutes +=
          (new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / 60000
      }
    }

    const staffStats = Array.from(staffMap.values()).map((s) => ({
      name: s.name,
      completed: s.count,
      avgMinutes: s.count > 0 ? Math.round(s.totalMinutes / s.count) : null,
    }))

    const aiSummary = await generateAISummary({ totalRooms: totalRooms ?? 0, completed, completionRate, staffStats })

    await sendEmail({
      to: hotel.admin_email,
      subject: `[Roomly] ${hotel.name} 일일 리포트 — ${dateStr}`,
      react: DailyReportEmail({
        hotelName: hotel.name,
        date: dateStr,
        totalRooms: totalRooms ?? 0,
        completed,
        completionRate,
        staffStats,
        aiSummary: aiSummary ?? undefined,
      }),
      hotelId: hotel.id,
      template: 'daily_report',
    })
    sent++
  }

  return NextResponse.json({ sent })
}
