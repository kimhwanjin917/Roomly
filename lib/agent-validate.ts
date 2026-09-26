import { isUrgent, predictedMinutes } from '@/lib/rooms'

/**
 * 에이전트 배정안 검증 — 모델이 낸 계획을 실행 전에 규칙으로 검사한다.
 *
 * 위반을 예외로 던지지 않고 문자열 목록으로 돌려주는 게 핵심이다.
 * 이 목록이 그대로 tool_result로 모델에게 돌아가고, 모델은 그걸 읽고
 * 계획을 다시 짠다 (lib/agent.ts의 재시도 루프).
 * 즉 여기는 "거부 사유를 모델이 읽을 수 있는 문장으로 쓰는" 곳이다.
 */

export interface PlanRoom {
  id: string
  number: string
  type: string
  status: string
  checkin_time: string | null
}

export interface PlanStaff {
  id: string
  name: string
}

export interface PlanItem {
  roomId: string
  staffId: string
  reason?: string
}

/**
 * 한 직원이 균등 분배분보다 얼마나 더 떠안아도 되는지 (분).
 * ponytail: 고정 임계값. 직원별 숙련도까지 반영하려면 staff 통계를 넣어야 한다.
 */
export const LOAD_GAP_LIMIT_MINUTES = 60

/**
 * 배정안을 검사해 위반 사유를 돌려준다. 빈 배열이면 실행해도 된다.
 *
 * @param rooms 배정 대상 객실 (미배정 + 청소 필요)
 * @param staff 배정 가능한 직원
 */
export function validatePlan(
  plan: PlanItem[],
  rooms: PlanRoom[],
  staff: PlanStaff[],
  now: Date = new Date(),
): string[] {
  const violations: string[] = []

  const roomById = new Map(rooms.map(r => [r.id, r]))
  const staffById = new Map(staff.map(s => [s.id, s]))

  // 1. 존재하지 않는 ID — 모델이 지어낸 값
  for (const item of plan) {
    if (!roomById.has(item.roomId)) {
      violations.push(`존재하지 않는 객실 ID입니다: ${item.roomId}`)
    }
    if (!staffById.has(item.staffId)) {
      violations.push(`존재하지 않는 직원 ID입니다: ${item.staffId}`)
    }
  }

  // 2. 한 객실을 두 명에게 배정
  const seen = new Set<string>()
  for (const item of plan) {
    if (seen.has(item.roomId)) {
      const number = roomById.get(item.roomId)?.number ?? item.roomId
      violations.push(`${number}호가 두 번 이상 배정됐습니다. 한 객실은 한 명에게만 배정하세요.`)
    }
    seen.add(item.roomId)
  }

  // 3. 배정할 수 있는데 아무것도 안 한 경우
  if (rooms.length > 0 && staff.length > 0 && plan.length === 0) {
    violations.push(
      `배정 대상 객실이 ${rooms.length}개, 가용 직원이 ${staff.length}명인데 계획이 비어 있습니다.`,
    )
  }

  // 4. 체크인 임박 객실 누락 — 가장 치명적인 실패
  for (const room of rooms) {
    if (isUrgent(room, now) && !seen.has(room.id)) {
      violations.push(
        `${room.number}호는 체크인이 임박했는데 배정되지 않았습니다. 최우선으로 배정하세요.`,
      )
    }
  }

  // 5. 특정 직원에게 쏠림 — 예상 소요 시간 합으로 판단한다
  if (staff.length > 0 && plan.length > 0) {
    const loadByStaff = new Map<string, number>(staff.map(s => [s.id, 0]))
    let total = 0

    for (const item of plan) {
      const room = roomById.get(item.roomId)
      if (!room || !loadByStaff.has(item.staffId)) continue
      const minutes = predictedMinutes(room.type)
      loadByStaff.set(item.staffId, (loadByStaff.get(item.staffId) ?? 0) + minutes)
      total += minutes
    }

    const even = total / staff.length
    for (const [staffId, load] of Array.from(loadByStaff)) {
      if (load > even + LOAD_GAP_LIMIT_MINUTES) {
        const name = staffById.get(staffId)?.name ?? staffId
        violations.push(
          `${name}에게 ${Math.round(load)}분치가 몰렸습니다 (균등 분배 시 ${Math.round(even)}분). 다른 직원에게 나누세요.`,
        )
      }
    }
  }

  return violations
}
