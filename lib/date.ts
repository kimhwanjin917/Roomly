/**
 * 날짜 유틸 — 결제 주기 계산과 KST 기준 일자 계산의 단일 출처.
 */

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * 개월 수 더하기. Date.setMonth()는 월말 오버플로우 버그가 있다(1/31 + 1개월 → 3/3).
 * 목표 월의 마지막 날로 클램프한다.
 */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

/** 연 단위 더하기 (2/29 → 평년이면 2/28로 클램프) */
export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12)
}

/** 결제 주기만큼 더한 다음 만료일 */
export function addBillingInterval(date: Date, interval: 'monthly' | 'yearly'): Date {
  return interval === 'yearly' ? addYears(date, 1) : addMonths(date, 1)
}

/** KST 기준 YYYY-MM-DD */
export function kstDateStr(date: Date = new Date()): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/** KST 기준 하루의 시작/끝 ISO 문자열 (오프셋 표기 포함) */
export function kstDayRange(dateStr: string): { start: string; end: string } {
  return { start: `${dateStr}T00:00:00+09:00`, end: `${dateStr}T23:59:59+09:00` }
}

/** KST 자정(=UTC 15:00) — 게스트 코드 만료 등 "오늘 자정까지" 계산용 */
export function nextKstMidnight(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + (now.getUTCHours() >= 15 ? 1 : 0),
      15, 0, 0,
    ),
  )
}

/** 한국어 날짜 표기 (KST) — 이메일/화면 공용 */
export function formatKoreanDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** n일 전 시각 */
export function daysAgo(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000)
}

/** n시간 전 시각 */
export function hoursAgo(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - hours * 60 * 60 * 1000)
}
