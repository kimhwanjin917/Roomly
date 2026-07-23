import { C } from '@/lib/theme'
import { DEFAULT_CHECKIN_ALERT_MINUTES, type RoomStatus } from '@/lib/constants'

/**
 * 객실 표시 로직 — 관리자/워커/게스트 대시보드가 공유한다.
 * (예전에는 isUrgent / fmtTime / TYPE_LABELS가 화면마다 복제돼 있었다)
 */

export const TYPE_LABELS: Record<string, string> = {
  single: '싱글',
  double: '더블',
  suite: '스위트',
  other: '기타',
}

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

/** 상태별 라벨과 색 */
export const STATUS_CONFIG: Record<RoomStatus, {
  label: string
  bg: string
  text: string
  dot: string
}> = {
  dirty:    { label: '더티',     bg: 'rgba(74,79,88,0.18)',    text: C.textMid, dot: C.textDim },
  cleaning: { label: '청소중',   bg: 'rgba(251,191,36,0.10)',  text: C.amber,   dot: C.amber   },
  done:     { label: '완료',     bg: 'rgba(52,211,153,0.10)',  text: C.green,   dot: C.green   },
  inspect:  { label: '점검대기', bg: 'rgba(129,140,248,0.10)', text: C.violet,  dot: C.violet  },
}

/** 객실 타입별 예상 청소 시간(분) */
export const PREDICTED_MINUTES: Record<string, number> = {
  single: 20,
  double: 30,
  suite: 45,
  other: 25,
}

export function predictedMinutes(type: string): number {
  return PREDICTED_MINUTES[type] ?? 30
}

/** 체크인 임박 알림 기준 (분) — 클라이언트 환경변수, 미설정 시 기본값 */
export const ALERT_MINUTES =
  Number(process.env.NEXT_PUBLIC_CHECKIN_ALERT_MINUTES) || DEFAULT_CHECKIN_ALERT_MINUTES

export interface UrgencyInput {
  status: string
  checkin_time: string | null
}

/**
 * 체크인이 임박했는데 아직 청소가 끝나지 않은 객실인지.
 * 완료(done)/점검대기(inspect)는 대상이 아니다.
 */
export function isUrgent(room: UrgencyInput, now: Date): boolean {
  if (!room.checkin_time) return false
  if (room.status === 'done' || room.status === 'inspect') return false

  const alertAt = new Date(room.checkin_time).getTime() - ALERT_MINUTES * 60_000
  return now.getTime() >= alertAt
}

/** 청소가 끝난 상태인지 (완료 또는 점검대기) */
export function isFinished(status: string): boolean {
  return status === 'done' || status === 'inspect'
}

/** HH:MM (KST) */
export function fmtTime(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** <input type="datetime-local">가 요구하는 로컬 시각 문자열 */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
