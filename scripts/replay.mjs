#!/usr/bin/env node
/**
 * 배정 전략 리플레이 — 에이전트 vs 규칙 기반을 같은 하루에 돌려 비교한다.
 *
 * 제품 기능이 아니다. 포트폴리오에 넣을 비교표를 뽑기 위한 1회성 분석 스크립트다.
 * 그래서 Supabase도 Next.js도 타지 않고 전부 메모리에서 돈다.
 *
 * 실행:
 *   node scripts/replay.mjs            # 에이전트 + 규칙 기반 비교 (ANTHROPIC_API_KEY 필요)
 *   node scripts/replay.mjs --check    # 검증 규칙 자체 점검만 (API 키 불필요)
 *
 * ponytail: 검증 규칙(RULES)이 lib/agent-validate.ts와 중복돼 있다. 이 스크립트는
 * TS 경로 별칭을 못 읽어서 복제했다. 규칙을 고칠 때 두 곳을 같이 고쳐야 한다.
 * 규칙이 더 늘어나면 순수 JS로 내리고 양쪽에서 import 하는 게 맞다.
 */

import Anthropic from '@anthropic-ai/sdk'

// ── 시뮬레이션 설정 ─────────────────────────────────────────

const ROOM_TYPES = ['single', 'double', 'suite', 'other']
const PREDICTED_MINUTES = { single: 20, double: 30, suite: 45, other: 25 }
const ALERT_MINUTES = 120
const LOAD_GAP_LIMIT_MINUTES = 60
const MAX_REJECTS = 3

const STAFF = ['김민지', '박서준', '이하늘', '정우성'].map((name, i) => ({
  id: `staff-${i + 1}`,
  name,
  // 실제 직원은 숙련도가 다르다 — 예상 시간에 곱해지는 계수
  speed: [0.85, 1.0, 1.15, 1.0][i],
}))

/** 09:00부터 15분 단위로 18:00까지 */
const STEP_MINUTES = 15
const DAY_START_HOUR = 9
const DAY_END_HOUR = 18

/** 결정적 난수 — 같은 시드면 같은 하루가 재생된다 */
function makeRandom(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** 하루치 체크아웃 시나리오를 만든다 */
function buildScenario(seed = 42, roomCount = 40) {
  const random = makeRandom(seed)
  const base = new Date('2026-09-26T00:00:00+09:00')
  const at = minutes => new Date(base.getTime() + minutes * 60_000)

  const rooms = []
  for (let i = 0; i < roomCount; i++) {
    const floor = 2 + Math.floor(i / 10)
    const type = ROOM_TYPES[Math.floor(random() * ROOM_TYPES.length)]
    // 체크아웃은 09:00~14:00 사이에 흩어진다
    const checkoutMin = DAY_START_HOUR * 60 + Math.floor(random() * 300)
    // 체크인은 체크아웃 2~6시간 뒤
    const checkinMin = checkoutMin + 120 + Math.floor(random() * 240)

    rooms.push({
      id: `room-${i + 1}`,
      number: String(floor * 100 + (i % 10) + 1),
      floor,
      type,
      checkoutAt: at(checkoutMin),
      checkinAt: at(checkinMin),
      status: 'clean',
      assignedTo: null,
      startedAt: null,
      doneAt: null,
    })
  }
  return { rooms, dayStart: at(DAY_START_HOUR * 60), dayEnd: at(DAY_END_HOUR * 60) }
}

// ── 검증 규칙 (lib/agent-validate.ts의 복제본) ───────────────

function validatePlan(plan, rooms, staff, now) {
  const violations = []
  const roomById = new Map(rooms.map(r => [r.id, r]))
  const staffById = new Map(staff.map(s => [s.id, s]))

  for (const item of plan) {
    if (!roomById.has(item.roomId)) violations.push(`존재하지 않는 객실 ID: ${item.roomId}`)
    if (!staffById.has(item.staffId)) violations.push(`존재하지 않는 직원 ID: ${item.staffId}`)
  }

  const seen = new Set()
  for (const item of plan) {
    if (seen.has(item.roomId)) {
      violations.push(`${roomById.get(item.roomId)?.number ?? item.roomId}호가 두 번 배정됐습니다.`)
    }
    seen.add(item.roomId)
  }

  if (rooms.length > 0 && staff.length > 0 && plan.length === 0) {
    violations.push(`배정 대상 ${rooms.length}개, 직원 ${staff.length}명인데 계획이 비어 있습니다.`)
  }

  for (const room of rooms) {
    const urgent = now.getTime() >= room.checkinAt.getTime() - ALERT_MINUTES * 60_000
    if (urgent && !seen.has(room.id)) {
      violations.push(`${room.number}호는 체크인이 임박했는데 배정되지 않았습니다.`)
    }
  }

  if (staff.length > 0 && plan.length > 0) {
    const load = new Map(staff.map(s => [s.id, 0]))
    let total = 0
    for (const item of plan) {
      const room = roomById.get(item.roomId)
      if (!room || !load.has(item.staffId)) continue
      const m = PREDICTED_MINUTES[room.type] ?? 30
      load.set(item.staffId, load.get(item.staffId) + m)
      total += m
    }
    const even = total / staff.length
    for (const [staffId, minutes] of load) {
      if (minutes > even + LOAD_GAP_LIMIT_MINUTES) {
        violations.push(`${staffById.get(staffId)?.name}에게 ${minutes}분치가 몰렸습니다.`)
      }
    }
  }

  return violations
}

// ── 배정 전략 ───────────────────────────────────────────────

/** 규칙 기반 — 체크인이 빠른 방부터 직원에게 순서대로 돌린다 */
function ruleBasedPlan(pending, staff) {
  const sorted = [...pending].sort((a, b) => a.checkinAt - b.checkinAt)
  return sorted.map((room, i) => ({
    roomId: room.id,
    staffId: staff[i % staff.length].id,
    reason: '체크인 순서대로 순환 배정',
  }))
}

/** 에이전트 — Claude가 판단하고, 검증을 통과할 때까지 다시 짠다 */
async function agentPlan(client, pending, staff, now, stats) {
  const board = pending.map(r => ({
    id: r.id,
    number: r.number,
    floor: r.floor,
    type: r.type,
    estimatedMinutes: PREDICTED_MINUTES[r.type] ?? 30,
    checkinAt: r.checkinAt.toISOString(),
    urgent: now.getTime() >= r.checkinAt.getTime() - ALERT_MINUTES * 60_000,
  }))

  const staffInfo = staff.map(s => ({
    id: s.id,
    name: s.name,
    currentlyWorkingOn: s.busyUntil && s.busyUntil > now ? 1 : 0,
    avgMinutes: Math.round((PREDICTED_MINUTES.double ?? 30) * s.speed),
  }))

  const messages = [
    {
      role: 'user',
      content: `현재 시각 ${now.toISOString()}. 아래 객실을 직원에게 배정하세요.

객실: ${JSON.stringify(board)}
직원: ${JSON.stringify(staffInfo)}

원칙: urgent=true 우선. estimatedMinutes 합이 직원끼리 비슷하도록. 같은 층은 같은 직원에게.
JSON으로만 응답: {"assignments":[{"roomId":"...","staffId":"...","reason":"..."}]}`,
    },
  ]

  for (let attempt = 0; attempt < MAX_REJECTS; attempt++) {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages,
    })
    const text = res.content.find(b => b.type === 'text')?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    let plan = []
    try {
      plan = JSON.parse(match?.[0] ?? '{}').assignments ?? []
    } catch {
      plan = []
    }

    const violations = validatePlan(plan, pending, staff, now)
    if (violations.length === 0) return plan

    stats.rejects++
    messages.push({ role: 'assistant', content: text })
    messages.push({
      role: 'user',
      content: `계획이 거부됐습니다. 아무것도 실행되지 않았습니다.\n위반:\n- ${violations.join('\n- ')}\n\n고쳐서 같은 JSON 형식으로 다시 제출하세요.`,
    })
  }

  // 3회 거부 — 실제 제품이라면 여기서 alert_admin을 부른다
  stats.escalations++
  return ruleBasedPlan(pending, staff)
}

// ── 시뮬레이션 실행 ─────────────────────────────────────────

async function simulate(label, planner) {
  const { rooms, dayStart, dayEnd } = buildScenario()
  const staff = STAFF.map(s => ({ ...s, busyUntil: null, totalMinutes: 0 }))
  const stats = { rejects: 0, escalations: 0, cycles: 0 }

  for (let t = dayStart.getTime(); t <= dayEnd.getTime(); t += STEP_MINUTES * 60_000) {
    const now = new Date(t)

    // 체크아웃 발생 → 더티
    for (const room of rooms) {
      if (room.status === 'clean' && room.checkoutAt <= now) room.status = 'dirty'
    }

    // 청소 완료 처리
    for (const room of rooms) {
      if (room.status === 'cleaning' && room.doneAt && room.doneAt <= now) room.status = 'done'
    }

    const pending = rooms.filter(r => r.status === 'dirty' && !r.assignedTo)
    if (pending.length === 0) continue

    stats.cycles++
    const plan = await planner(pending, staff, now, stats)

    for (const item of plan) {
      const room = rooms.find(r => r.id === item.roomId)
      const person = staff.find(s => s.id === item.staffId)
      if (!room || !person || room.assignedTo) continue

      const minutes = Math.round((PREDICTED_MINUTES[room.type] ?? 30) * person.speed)
      // 직원은 한 번에 한 방 — 앞 작업이 끝난 뒤부터 시작한다
      const startAt = new Date(Math.max(now.getTime(), person.busyUntil?.getTime() ?? 0))

      room.assignedTo = person.id
      room.startedAt = startAt
      room.doneAt = new Date(startAt.getTime() + minutes * 60_000)
      room.status = 'cleaning'

      person.busyUntil = room.doneAt
      person.totalMinutes += minutes
    }
  }

  // ── 지표 ──
  const worked = rooms.filter(r => r.checkoutAt <= dayEnd)
  const missed = worked.filter(r => !r.doneAt || r.doneAt > r.checkinAt)
  const loads = staff.map(s => s.totalMinutes)
  const loadGap = Math.max(...loads) - Math.min(...loads)

  return {
    label,
    rooms: worked.length,
    missed: missed.length,
    missedRooms: missed.map(r => r.number),
    loadGap,
    loads: Object.fromEntries(staff.map(s => [s.name, s.totalMinutes])),
    rejects: stats.rejects,
    escalations: stats.escalations,
    cycles: stats.cycles,
  }
}

// ── 검증 규칙 자체 점검 ─────────────────────────────────────

function checkRules() {
  const now = new Date('2026-09-26T12:00:00+09:00')
  const rooms = [
    { id: 'r1', number: '201', type: 'suite', checkinAt: new Date('2026-09-26T13:00:00+09:00') },
    { id: 'r2', number: '202', type: 'single', checkinAt: new Date('2026-09-26T20:00:00+09:00') },
  ]
  const staff = [{ id: 's1', name: 'A' }, { id: 's2', name: 'B' }]
  const ok = p => validatePlan(p, rooms, staff, now)

  const cases = [
    ['지어낸 객실 ID를 잡는다', [{ roomId: 'nope', staffId: 's1' }], /존재하지 않는 객실/],
    ['지어낸 직원 ID를 잡는다', [{ roomId: 'r1', staffId: 'nope' }], /존재하지 않는 직원/],
    ['중복 배정을 잡는다', [{ roomId: 'r1', staffId: 's1' }, { roomId: 'r1', staffId: 's2' }], /두 번 배정/],
    ['빈 계획을 잡는다', [], /계획이 비어 있습니다/],
    ['체크인 임박 누락을 잡는다', [{ roomId: 'r2', staffId: 's1' }], /체크인이 임박/],
  ]

  let failed = 0
  for (const [name, plan, pattern] of cases) {
    const violations = ok(plan)
    const hit = violations.some(v => pattern.test(v))
    console.log(`${hit ? '  통과' : '  실패'}  ${name}`)
    if (!hit) {
      console.log(`        기대: ${pattern} / 실제: ${JSON.stringify(violations)}`)
      failed++
    }
  }

  // 정상 계획은 위반이 없어야 한다
  const clean = ok([{ roomId: 'r1', staffId: 's1' }, { roomId: 'r2', staffId: 's2' }])
  console.log(`${clean.length === 0 ? '  통과' : '  실패'}  정상 계획은 통과시킨다`)
  if (clean.length > 0) {
    console.log(`        실제: ${JSON.stringify(clean)}`)
    failed++
  }

  return failed
}

function printResult(r) {
  console.log(`\n[${r.label}]`)
  console.log(`  처리 객실        ${r.rooms}개`)
  console.log(`  체크인 초과      ${r.missed}건${r.missed ? ` (${r.missedRooms.join(', ')}호)` : ''}`)
  console.log(`  직원 부하 편차   ${r.loadGap}분   ${JSON.stringify(r.loads)}`)
  if (r.rejects !== undefined) console.log(`  검증 거부        ${r.rejects}회`)
  if (r.escalations) console.log(`  관리자 에스컬레이션 ${r.escalations}회`)
}

async function main() {
  console.log('검증 규칙 점검')
  const failed = checkRules()
  if (failed > 0) {
    console.error(`\n검증 규칙 점검 실패 ${failed}건`)
    process.exit(1)
  }

  if (process.argv.includes('--check')) return

  const baseline = await simulate('규칙 기반 (체크인순 순환 배정)', async (pending, staff) =>
    ruleBasedPlan(pending, staff),
  )
  printResult(baseline)

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\nANTHROPIC_API_KEY가 없어 에이전트 비교는 건너뜁니다.')
    return
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const agent = await simulate('에이전트 (Claude + 검증 루프)', (pending, staff, now, stats) =>
    agentPlan(client, pending, staff, now, stats),
  )
  printResult(agent)

  console.log('\n요약')
  console.log(`  체크인 초과   ${baseline.missed}건 → ${agent.missed}건`)
  console.log(`  부하 편차     ${baseline.loadGap}분 → ${agent.loadGap}분`)
  console.log(`  검증이 되돌린 계획  ${agent.rejects}회`)
  console.log('\n※ 실사용 호텔 데이터가 아닌 시드 시나리오 기반 시뮬레이션입니다.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
