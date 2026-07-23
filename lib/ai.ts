import Anthropic from '@anthropic-ai/sdk'

/**
 * Claude 호출 래퍼 — AI 인사이트/배정 추천/리포트 요약이 공유한다.
 * ANTHROPIC_API_KEY가 없으면 AI 기능만 비활성화되고 나머지 흐름은 그대로 동작한다.
 */

const MODEL = 'claude-haiku-4-5-20251001'

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY

/** 프롬프트를 보내고 텍스트 응답을 받는다. 실패하거나 키가 없으면 null. */
export async function askClaude(prompt: string, maxTokens = 512): Promise<string | null> {
  if (!aiEnabled()) return null

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = message.content[0]
    return block?.type === 'text' ? block.text : null
  } catch (err) {
    console.error('[ai] Claude 호출 실패', err)
    return null
  }
}

/**
 * JSON 응답을 기대하는 프롬프트용. 모델이 앞뒤로 설명을 붙여도 첫 JSON 객체만 파싱한다.
 * 파싱 실패 시 null.
 */
export async function askClaudeJson<T>(prompt: string, maxTokens = 512): Promise<T | null> {
  const text = await askClaude(prompt, maxTokens)
  if (!text) return null

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null

  try {
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}
