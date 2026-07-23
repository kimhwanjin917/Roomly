/**
 * 앱 전역 상수 — 라우트/화면 여러 곳에 흩어져 있던 리터럴의 단일 출처.
 */

/** 객실 청소 상태 */
export const ROOM_STATUSES = ['dirty', 'cleaning', 'done', 'inspect'] as const
export type RoomStatus = (typeof ROOM_STATUSES)[number]

export function isRoomStatus(value: unknown): value is RoomStatus {
  return typeof value === 'string' && (ROOM_STATUSES as readonly string[]).includes(value)
}

/** 직원 역할 (QR 토큰의 worker_role) */
export const STAFF_ROLES = ['housekeeping', 'dirty'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value)
}

/** 객실 타입 */
export const ROOM_TYPES = ['single', 'double', 'suite', 'other'] as const
export type RoomType = (typeof ROOM_TYPES)[number]

/** 플랜별 객실 수 상한 */
export const PLAN_ROOM_LIMITS: Record<string, number> = {
  trial: 50,
  starter: 50,
  standard: 150,
  pro: 9999,
}

export const DEFAULT_ROOM_LIMIT = PLAN_ROOM_LIMITS.trial

/** 세션 쿠키 이름 */
export const COOKIES = {
  worker: 'roomly_worker_session',
  guest: 'roomly_guest_session',
  superAdmin: 'super_admin_session',
  locale: 'roomly_locale',
} as const

/** 지원 로케일 (i18n/request.ts와 공유) */
export const SUPPORTED_LOCALES = ['ko', 'en', 'vi'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** 체크인 임박 알림 기본 기준 (분) */
export const DEFAULT_CHECKIN_ALERT_MINUTES = 120

/** 앱 URL — 이메일/QR 링크 등 절대 URL 생성용 */
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'
}

/**
 * 공개 데모 계정 — 랜딩 페이지의 "데모 체험하기" 버튼(/api/demo)이 사용한다.
 * 더미 데이터만 담긴 별도 호텔이며, 자동 이메일 발송 대상에서는 제외돼 있다.
 */
export const DEMO_ACCOUNT = {
  email: 'demo@example.com',
  password: 'demo1234',
} as const

