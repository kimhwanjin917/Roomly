import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { DailyReportEmail } from '@/emails/DailyReportEmail'
import { withApiError } from '@/lib/api-error'

/**
 * AI-03: 일일 리포트 AI 요약 (ANTHROPIC_API_KEY 있을 때만).
 * 실패해도 리포트 발송은 계속되도록 null 반환.
 */
async function generateAiSummary(stats: {
  completionRate: number
  completed: number
  avgMinutes: number
  delayed: number
}): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `어제 하우스키핑: 완료율 ${stats.completionRate}%, 완료 ${stats.completed}건, 평균 처리 ${stats.avgMinutes}분, 딜레이 ${stats.delayed}건. 관리자용 2문장 요약. 과장 없이.`,
        },
      ],
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock && textBlock.type === 'text' ? textBlock.text.trim() : null
  } catch {
    return null
  }
}

async function getHandler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Yesterday in KST (UTC+9)
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const kstNow = new Date(now.getTime() + kstOffset)
  const yesterday = new Date(kstNow)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().slice(0, 10)
  const dayStart = `${dateStr}T00:00:00+09:00`
  const dayEnd = `${dateStr}T23:59:59+09:00`

  // Get all hotels
  const { data: hotels } = await service.from('hotels').select('id, name')
  if (!hotels?.length) return NextResponse.json({ sent: 0 })

  // Fetch all auth users once to avoid repeated calls
  const {
    data: { users },
  } = await service.auth.admin.listUsers()

  let sent = 0
  for (const hotel of hotels) {
    // Find the admin user for this hotel
    const adminUser = users.find((u) => u.app_metadata?.hotel_id === hotel.id)
    if (!adminUser?.email) continue

    // Total active rooms for this hotel
    const { count: totalRooms } = await service
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotel.id)
      .is('deleted_at', null)

    // Completed assignments yesterday, joined with rooms to filter by hotel
    const { data: assignments } = await service
      .from('assignments')
      .select('staff_id, assigned_at, completed_at, staff:staff_id(name), rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotel.id)
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd)
      .not('completed_at', 'is', null)

    const completed = assignments?.length ?? 0
    const completionRate = totalRooms ? Math.round((completed / totalRooms) * 100) : 0

    // Aggregate per-staff stats
    const staffMap = new Map<string, { name: string; count: number; totalMinutes: number }>()
    for (const a of assignments ?? []) {
      const staffId = a.staff_id ?? 'guest'
      const staffName = (a.staff as { name: string }[] | null)?.[0]?.name ?? '게스트'
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

    // 전체 평균 처리시간(분) + 어제 딜레이(체크인 2시간 전 알림) 건수
    const totalMinutesAll = Array.from(staffMap.values()).reduce((sum, s) => sum + s.totalMinutes, 0)
    const avgMinutesAll = completed > 0 ? Math.round(totalMinutesAll / completed) : 0

    const { count: delayedCount } = await service
      .from('room_logs')
      .select('*, rooms!inner(hotel_id)', { count: 'exact', head: true })
      .eq('rooms.hotel_id', hotel.id)
      .eq('alert_type', 'urgent_2h')
      .gte('changed_at', dayStart)
      .lte('changed_at', dayEnd)

    const aiSummary = await generateAiSummary({
      completionRate,
      completed,
      avgMinutes: avgMinutesAll,
      delayed: delayedCount ?? 0,
    })

    await sendEmail({
      to: adminUser.email,
      subject: `[Roomly] ${hotel.name} 일일 리포트 — ${dateStr}`,
      hotelId: hotel.id,
      react: DailyReportEmail({
        hotelName: hotel.name,
        date: dateStr,
        totalRooms: totalRooms ?? 0,
        completed,
        completionRate,
        staffStats,
        aiSummary: aiSummary ?? undefined,
      }),
    })
    sent++
  }

  return NextResponse.json({ sent })
}

export const GET = withApiError(getHandler)
