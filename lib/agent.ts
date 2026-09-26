import { randomUUID } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AGENT_TOOLS, runTool, type AgentContext, type AgentLogKind } from '@/lib/agent-tools'
import { ALERT_MINUTES } from '@/lib/rooms'

/**
 * 하우스키핑 매니저 에이전트 — 관찰 → 계획 → 검증 → 실행 루프.
 *
 * lib/ai.ts의 askClaude와 다른 점은 하나다: 여기서는 모델이 도구를 직접 호출한다.
 * 사람이 데이터를 떠먹여주고 답만 받아오는 게 아니라, 모델이 스스로 현황판을 읽고
 * 배정을 실행한다. 그리고 실행하려면 validatePlan을 통과해야 하고, 통과 못 하면
 * 거부 사유가 tool_result로 돌아가 같은 루프 안에서 다시 계획한다.
 */

const MODEL = 'claude-haiku-4-5'

/** 도구 호출 왕복 상한 — 무한 루프와 비용 폭주를 막는 안전장치 */
const MAX_TURNS = 8

const SYSTEM_PROMPT = `당신은 호텔 하우스키핑 배정을 책임지는 매니저입니다. 도구를 사용해 스스로 판단하고 실행하세요.

작업 순서:
1. get_board로 현황판을 확인한다.
2. get_staff_performance로 직원과 실적을 확인한다.
3. 배정안을 만들어 assign_rooms로 제출한다.
4. 거부되면 사유를 읽고 고쳐서 다시 제출한다.
5. 사람이 개입해야 하는 상황이면 alert_admin을 호출한다.

배정 절차 — 순서대로 적용하세요:
1. urgent=true인 객실을 체크인이 이른 순으로 먼저 배정한다.
   (체크인 ${ALERT_MINUTES}분 전부터 urgent로 표시된다)
2. 객실마다 직원을 고른다. 아래를 위에서부터 적용한다.
   a. estimatedMinutes가 40분 이상인 무거운 객실은 last7dAvgMinutes가 가장 짧은 직원에게 준다.
   b. 같은 층에 이미 배정한 직원이 있으면 그 직원에게 몰아준다 (이동 시간 절약).
   c. 나머지는 currentlyWorkingOn이 적은 직원부터 쓴다.
3. 배정을 마치기 전에 직원별 estimatedMinutes 합을 계산한다.
   한 직원이 다른 직원보다 60분 이상 많으면 그 직원의 객실을 한가한 직원에게 넘긴다.

last7dAvgMinutes는 그 직원이 실제로 객실 하나를 끝내는 데 걸린 평균 시간이다.
값이 작을수록 빠른 직원이다. null이면 실적이 없다는 뜻이니 기준으로 쓰지 않는다.

배정할 객실이 없으면 아무 도구도 호출하지 말고 "배정할 객실 없음"이라고만 답하세요.
도구 호출이 끝나면 한국어 한 문장으로 무엇을 했는지 요약하세요.`

export interface AgentCycleResult {
  cycleId: string
  /** AI 키가 없어 아무것도 하지 않은 경우 false */
  ran: boolean
  turns: number
  assigned: number
  rejected: number
  summary: string | null
}

/**
 * 한 호텔에 대해 에이전트를 1사이클 돌린다.
 * 실패해도 예외를 던지지 않는다 — 크론이 다른 호텔을 계속 처리해야 한다.
 */
export async function runAgentCycle(
  service: SupabaseClient,
  hotelId: string,
  now: Date = new Date(),
): Promise<AgentCycleResult> {
  const cycleId = randomUUID()
  const empty: AgentCycleResult = {
    cycleId,
    ran: false,
    turns: 0,
    assigned: 0,
    rejected: 0,
    summary: null,
  }

  if (!process.env.ANTHROPIC_API_KEY) return empty

  let assigned = 0

  const ctx: AgentContext = {
    service,
    hotelId,
    now,
    rejectCount: 0,
    log: async (kind: AgentLogKind, message: string, detail?: unknown) => {
      if (kind === 'assign') assigned++
      const { error } = await service
        .from('agent_logs')
        .insert({ hotel_id: hotelId, cycle_id: cycleId, kind, message, detail: detail ?? null })
      // 로그 실패가 배정을 막으면 안 된다 — 기록만 포기하고 계속 진행한다
      if (error) console.error('[agent] 로그 기록 실패', error.message)
    },
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: `현재 시각: ${now.toISOString()}. 지금 배정 상황을 점검하고 처리하세요.` },
  ]

  let turns = 0
  let summary: string | null = null

  try {
    while (turns < MAX_TURNS) {
      turns++

      const response = await client.messages.create({
        model: MODEL,
        // 미배정 객실이 수십 개면 assign_rooms 인자만으로 수천 토큰이 된다.
        // 모자라면 tool_use 블록이 잘린 채 끝나 아무것도 실행되지 않는다.
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        messages,
      })

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join(' ')
        .trim()
      if (text) summary = text

      // 응답이 잘리면 도구 호출이 반쪽이라 실행할 수 없다 — 조용히 끝내지 않고 남긴다
      if (response.stop_reason === 'max_tokens') {
        await ctx.log('error', '모델 응답이 토큰 상한에서 잘려 이번 사이클을 중단했습니다.')
        break
      }

      if (response.stop_reason !== 'tool_use') break

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )
      if (!toolUses.length) break

      messages.push({ role: 'assistant', content: response.content })

      const results: Anthropic.ToolResultBlockParam[] = []
      for (const use of toolUses) {
        const result = await runTool(ctx, use.name, (use.input ?? {}) as Record<string, unknown>)
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: JSON.stringify(result),
        })
      }

      messages.push({ role: 'user', content: results })
    }

    if (turns >= MAX_TURNS) {
      await ctx.log('error', `도구 호출 ${MAX_TURNS}회 상한에 도달해 중단했습니다.`)
    }
  } catch (err) {
    console.error('[agent] 사이클 실패', err)
    await ctx.log('error', `에이전트 실행 중 오류: ${err instanceof Error ? err.message : '알 수 없음'}`)
  }

  return { cycleId, ran: true, turns, assigned, rejected: ctx.rejectCount, summary }
}
