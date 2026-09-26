import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import { sendPushToStaff, sendPushToAdmin } from '@/lib/push'
import { isUrgent, predictedMinutes, typeLabel, fmtTime } from '@/lib/rooms'
import { aggregateStaffStats, fetchCompletedAssignments } from '@/lib/reports'
import { daysAgo } from '@/lib/date'
import { validatePlan, type PlanItem, type PlanRoom, type PlanStaff } from '@/lib/agent-validate'

/**
 * 에이전트가 쥐는 도구 4개.
 *
 * 전부 관리자 화면이 이미 쓰던 동작을 감싼 것이다 — 새로 만든 업무 로직은 없다.
 * 사람 버튼에만 연결돼 있던 기능을 모델도 호출할 수 있게 노출하는 게 전부.
 *
 * assign_rooms만 예외적으로 실행 전에 validatePlan을 거친다. 위반이 있으면
 * 실행하지 않고 사유를 문자열로 돌려준다 — 모델은 그걸 읽고 다시 계획한다.
 */

export type AgentLogKind = 'observe' | 'plan' | 'reject' | 'assign' | 'alert' | 'error'

export interface AgentContext {
  service: SupabaseClient
  hotelId: string
  now: Date
  log: (kind: AgentLogKind, message: string, detail?: unknown) => Promise<void>
  /** assign_rooms가 검증에서 거부된 횟수. 상한을 넘으면 더 시도하지 않는다 */
  rejectCount: number
}

/** 검증 거부 상한 — 넘으면 모델에게 포기하고 관리자를 부르라고 알린다 */
export const MAX_REJECTS = 3

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_board',
    description:
      '호텔의 현재 객실 현황판을 조회한다. 배정이 필요한 객실(청소 필요 + 미배정) 목록과 ' +
      '전체 상태 요약을 돌려준다. 배정을 계획하기 전에 반드시 먼저 호출한다.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_staff_performance',
    description:
      '배정 가능한 직원 목록과 최근 7일 실적(완료 건수, 평균 소요 분), ' +
      '현재 처리 중인 배정 건수를 돌려준다. 누구에게 얼마나 줄지 정하기 전에 호출한다.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'assign_rooms',
    description:
      '배정안을 제출한다. 실행 전에 규칙 검증을 거친다 — 위반이 있으면 아무것도 실행되지 않고 ' +
      '위반 사유가 돌아온다. 그 경우 사유를 읽고 계획을 고쳐 다시 호출하라. ' +
      '검증을 통과하면 실제로 배정되고 직원에게 푸시 알림이 발송된다.',
    input_schema: {
      type: 'object',
      properties: {
        assignments: {
          type: 'array',
          description: '배정 목록. 한 객실은 한 번만 등장해야 한다.',
          items: {
            type: 'object',
            properties: {
              roomId: { type: 'string', description: 'get_board가 준 객실 id' },
              staffId: { type: 'string', description: 'get_staff_performance가 준 직원 id' },
              reason: { type: 'string', description: '이 직원에게 배정한 이유 한 줄 (한국어)' },
            },
            required: ['roomId', 'staffId', 'reason'],
          },
        },
      },
      required: ['assignments'],
    },
  },
  {
    name: 'alert_admin',
    description:
      '사람이 개입해야 하는 상황을 관리자에게 푸시로 알린다. ' +
      '직원이 없거나, 일손보다 객실이 너무 많거나, 검증을 계속 통과하지 못할 때 호출한다.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: '관리자가 읽을 한국어 한 문장' },
      },
      required: ['message'],
    },
  },
]

/**
 * 배정할 객실이 하나라도 있는지.
 *
 * 크론이 5분마다 도는데 한가한 시간대에도 모델을 부르면 호출비가 그냥 샌다.
 * 루프를 시작하기 전에 이걸로 걸러낸다.
 */
export async function hasPendingWork(
  service: SupabaseClient,
  hotelId: string,
): Promise<boolean> {
  const rooms = await loadUnassignedRooms(service, hotelId)
  return rooms.length > 0
}

/** 배정 대상 객실 — 청소가 끝나지 않았고 활성 배정이 없는 객실 */
async function loadUnassignedRooms(
  service: SupabaseClient,
  hotelId: string,
): Promise<PlanRoom[]> {
  const [{ data: rooms }, { data: active }] = await Promise.all([
    service
      .from('rooms')
      .select('id, number, floor, type, status, checkin_time')
      .eq('hotel_id', hotelId)
      .in('status', ['dirty', 'cleaning'])
      .is('deleted_at', null),
    // room_logs와 마찬가지로 assignments에는 hotel_id가 없다 — rooms 조인으로 좁힌다
    service
      .from('assignments')
      .select('room_id, rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotelId)
      .is('completed_at', null)
      .is('cancelled_at', null),
  ])

  const assigned = new Set((active ?? []).map(a => a.room_id))
  return ((rooms ?? []) as PlanRoom[]).filter(r => !assigned.has(r.id))
}

async function loadStaff(service: SupabaseClient, hotelId: string): Promise<PlanStaff[]> {
  const { data } = await service
    .from('staff')
    .select('id, name')
    .eq('hotel_id', hotelId)
  return (data ?? []) as PlanStaff[]
}

async function runGetBoard(ctx: AgentContext) {
  const [unassigned, { data: all }] = await Promise.all([
    loadUnassignedRooms(ctx.service, ctx.hotelId),
    ctx.service
      .from('rooms')
      .select('status')
      .eq('hotel_id', ctx.hotelId)
      .is('deleted_at', null),
  ])

  const summary = (all ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  await ctx.log(
    'observe',
    `현황판 조회 — 배정 대상 ${unassigned.length}개 (더티 ${summary.dirty ?? 0}, 청소중 ${summary.cleaning ?? 0}, 완료 ${summary.done ?? 0})`,
    { summary },
  )

  return {
    now: ctx.now.toISOString(),
    summary,
    unassignedRooms: unassigned.map(r => ({
      id: r.id,
      number: r.number,
      floor: (r as PlanRoom & { floor?: number | null }).floor ?? null,
      type: typeLabel(r.type),
      status: r.status,
      checkinTime: fmtTime(r.checkin_time),
      // 모델이 스스로 시각을 계산하지 않도록 판단 결과를 같이 준다
      urgent: isUrgent(r, ctx.now),
      estimatedMinutes: predictedMinutes(r.type),
    })),
  }
}

async function runGetStaffPerformance(ctx: AgentContext) {
  const staff = await loadStaff(ctx.service, ctx.hotelId)
  if (!staff.length) {
    await ctx.log('observe', '배정 가능한 직원이 없습니다.')
    return { staff: [], note: '등록된 직원이 없습니다. alert_admin으로 관리자를 부르세요.' }
  }

  const [completed, { data: active }] = await Promise.all([
    fetchCompletedAssignments(ctx.service, ctx.hotelId, { from: daysAgo(7, ctx.now).toISOString() }),
    ctx.service
      .from('assignments')
      .select('staff_id, rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', ctx.hotelId)
      .is('completed_at', null)
      .is('cancelled_at', null),
  ])

  const statsByName = new Map(aggregateStaffStats(completed).map(s => [s.name, s]))
  const activeCount = (active ?? []).reduce<Record<string, number>>((acc, a) => {
    if (a.staff_id) acc[a.staff_id] = (acc[a.staff_id] ?? 0) + 1
    return acc
  }, {})

  await ctx.log('observe', `직원 ${staff.length}명 실적 조회`)

  return {
    staff: staff.map(s => ({
      id: s.id,
      name: s.name,
      last7dCompleted: statsByName.get(s.name)?.completed ?? 0,
      last7dAvgMinutes: statsByName.get(s.name)?.avgMinutes ?? null,
      currentlyWorkingOn: activeCount[s.id] ?? 0,
    })),
  }
}

async function runAssignRooms(ctx: AgentContext, input: { assignments?: PlanItem[] }) {
  const plan = input.assignments ?? []
  const [rooms, staff] = await Promise.all([
    loadUnassignedRooms(ctx.service, ctx.hotelId),
    loadStaff(ctx.service, ctx.hotelId),
  ])

  const violations = validatePlan(plan, rooms, staff, ctx.now)

  if (violations.length > 0) {
    ctx.rejectCount++
    await ctx.log(
      'reject',
      `배정안 거부 (${ctx.rejectCount}/${MAX_REJECTS}) — ${violations[0]}`,
      { violations, plan },
    )

    if (ctx.rejectCount >= MAX_REJECTS) {
      return {
        accepted: false,
        violations,
        note: `${MAX_REJECTS}회 연속 거부됐습니다. 더 시도하지 말고 alert_admin으로 관리자를 부른 뒤 종료하세요.`,
      }
    }
    return {
      accepted: false,
      violations,
      note: '아무것도 실행되지 않았습니다. 위 사유를 반영해 계획을 고쳐 다시 호출하세요.',
    }
  }

  const roomById = new Map(rooms.map(r => [r.id, r]))
  const staffById = new Map(staff.map(s => [s.id, s]))
  const executed: string[] = []

  for (const item of plan) {
    const room = roomById.get(item.roomId)
    const person = staffById.get(item.staffId)
    if (!room || !person) continue

    // 기존 활성 배정 취소 후 새로 삽입 — api/admin/assign과 같은 순서
    await ctx.service
      .from('assignments')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('room_id', item.roomId)
      .is('completed_at', null)
      .is('cancelled_at', null)

    const { error } = await ctx.service
      .from('assignments')
      .insert({ room_id: item.roomId, staff_id: item.staffId, is_guest: false })

    if (error) {
      await ctx.log('error', `${room.number}호 배정 실패`, { error: error.message })
      continue
    }

    const estimated = predictedMinutes(room.type)
    await ctx.log('assign', `${room.number}호 → ${person.name} · ${item.reason ?? ''}`, {
      roomId: room.id,
      staffId: person.id,
      // 사후 검증용 — 실제 완료 시각과 비교해 예측이 맞았는지 따진다
      estimatedMinutes: estimated,
      predictedDoneAt: new Date(ctx.now.getTime() + estimated * 60_000).toISOString(),
    })

    // 푸시 실패가 배정을 막지 않도록 비차단 발송 (api/admin/assign과 동일)
    sendPushToStaff(item.staffId, {
      title: `${room.number}호 배정됨`,
      body: '청소를 시작해주세요',
      url: `/worker/${item.staffId}`,
      tag: `assign-${item.staffId}`,
    }).catch(() => {})

    executed.push(`${room.number}호 → ${person.name}`)
  }

  return { accepted: true, executed, count: executed.length }
}

async function runAlertAdmin(ctx: AgentContext, input: { message?: string }) {
  const message = input.message?.trim()
  if (!message) return { sent: false, note: 'message가 비어 있습니다.' }

  await ctx.log('alert', `관리자 호출 — ${message}`)
  await sendPushToAdmin(ctx.hotelId, {
    title: '하우스키핑 에이전트',
    body: message,
    url: '/admin',
    tag: 'agent-alert',
  }).catch(() => {})

  return { sent: true }
}

/** 도구 이름으로 핸들러를 호출한다. 결과는 JSON 문자열로 모델에게 돌아간다. */
export async function runTool(
  ctx: AgentContext,
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'get_board':
      return runGetBoard(ctx)
    case 'get_staff_performance':
      return runGetStaffPerformance(ctx)
    case 'assign_rooms':
      return runAssignRooms(ctx, input as { assignments?: PlanItem[] })
    case 'alert_admin':
      return runAlertAdmin(ctx, input as { message?: string })
    default:
      return { error: `알 수 없는 도구: ${name}` }
  }
}
