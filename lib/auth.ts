import { createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import * as jwt from 'jsonwebtoken'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ApiError } from '@/lib/api-error'
import { COOKIES, type StaffRole } from '@/lib/constants'

/**
 * 라우트 인증 컨텍스트 — 모든 API 라우트가 공유하는 인증/인가 진입점.
 *
 * 각 require* 함수는 실패 시 HttpError를 throw한다 (withApiError가 응답으로 변환).
 * 성공 시 hotel_id 등 라우트가 실제로 필요로 하는 값만 담은 컨텍스트를 돌려준다.
 */

// ── 관리자 (Supabase Auth 세션) ──────────────────────────────

export interface AdminContext {
  userId: string
  email: string | null
  hotelId: string
  /** 세션 쿠키를 쓰는 anon 클라이언트 — 비밀번호 변경/로그아웃 등 auth 조작용 */
  supabase: SupabaseClient
  /** RLS를 우회하는 service role 클라이언트 */
  service: SupabaseClient
}

export async function requireAdmin(): Promise<AdminContext> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw ApiError.unauthorized()

  const hotelId = user.app_metadata?.hotel_id as string | undefined
  if (!hotelId) throw ApiError.unauthorized('호텔 정보가 없는 계정입니다.', 'no_hotel')

  return {
    userId: user.id,
    email: user.email ?? null,
    hotelId,
    supabase: supabase as unknown as SupabaseClient,
    service: createServiceClient() as unknown as SupabaseClient,
  }
}

// ── 워커 / 게스트 (JWT 쿠키) ─────────────────────────────────

export interface WorkerContext {
  staffId: string
  hotelId: string
  workerRole: StaffRole
  service: SupabaseClient
}

export interface GuestContext {
  hotelId: string
  /** 이 세션의 일용직 staff 레코드 */
  staffId: string
  staffName: string
  service: SupabaseClient
}

function verifySessionCookie(request: NextRequest | undefined, name: string): jwt.JwtPayload {
  const raw = request
    ? request.cookies.get(name)?.value
    : cookies().get(name)?.value
  if (!raw) throw ApiError.unauthorized()

  try {
    return jwt.verify(raw, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    throw ApiError.unauthorized('세션이 만료되었습니다. QR을 다시 스캔해주세요.', 'session_expired')
  }
}

/**
 * 워커 세션 검증. `role`을 주면 해당 worker_role만 통과시킨다.
 * (예: 더티 전용 라우트는 requireWorker(req, 'dirty'))
 */
export async function requireWorker(
  request?: NextRequest,
  role?: StaffRole,
): Promise<WorkerContext> {
  const payload = verifySessionCookie(request, COOKIES.worker)

  const staffId = payload.app_metadata?.staff_id as string | undefined
  const hotelId = payload.app_metadata?.hotel_id as string | undefined
  if (!staffId || !hotelId) throw ApiError.unauthorized('잘못된 토큰입니다.', 'invalid_token')

  const workerRole = (payload.app_metadata?.worker_role ?? 'housekeeping') as StaffRole
  if (role && workerRole !== role) throw ApiError.forbidden()

  return { staffId, hotelId, workerRole, service: createServiceClient() as unknown as SupabaseClient }
}

/**
 * 일일 근무자(게스트) 세션 검증.
 *
 * 토큰에 박힌 guest_code_id가 현재 유효한 코드와 일치할 때만 통과시킨다.
 * 관리자가 코드를 재발급하면 새 행(새 id)이 생기므로 옛 세션은 여기서 즉시 끊긴다.
 */
export async function requireGuest(request?: NextRequest): Promise<GuestContext> {
  const payload = verifySessionCookie(request, COOKIES.guest)

  const hotelId = payload.app_metadata?.hotel_id as string | undefined
  const staffId = payload.app_metadata?.staff_id as string | undefined
  const guestCodeId = payload.app_metadata?.guest_code_id as string | undefined
  if (!hotelId || !staffId || !guestCodeId) {
    throw ApiError.unauthorized('다시 QR을 스캔해 입장해주세요.', 'session_expired')
  }

  const service = createServiceClient() as unknown as SupabaseClient

  const { data: current } = await service
    .from('guest_codes')
    .select('id')
    .eq('hotel_id', hotelId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!current || current.id !== guestCodeId) {
    throw ApiError.unauthorized('접속 코드가 재발급되었습니다. 새 QR로 다시 입장해주세요.', 'code_rotated')
  }

  // 세대는 맞지만 관리자가 개별 삭제했을 수 있다
  const { data: staff } = await service
    .from('staff')
    .select('id, name')
    .eq('id', staffId)
    .eq('hotel_id', hotelId)
    .maybeSingle()

  if (!staff) {
    throw ApiError.unauthorized('등록 정보가 없습니다. 다시 입장해주세요.', 'staff_removed')
  }

  return { hotelId, staffId: staff.id, staffName: staff.name, service }
}

// ── 슈퍼 관리자 (해시 비교 쿠키) ──────────────────────────────

export function superAdminHash(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export function requireSuperAdmin(): { service: SupabaseClient } {
  const token = cookies().get(COOKIES.superAdmin)?.value
  if (!token) throw ApiError.unauthorized()

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload
    if (payload.role !== 'super_admin') throw new Error('role mismatch')
  } catch {
    throw ApiError.unauthorized()
  }

  return { service: createServiceClient() as unknown as SupabaseClient }
}

// ── 공개 API 키 (v1) ────────────────────────────────────────

export interface ApiKeyContext {
  hotelId: string
  service: SupabaseClient
}

/**
 * `Authorization: Bearer <api key>` 검증.
 * 폐기된 키(revoked_at)는 거부하고, last_used를 비차단으로 갱신한다.
 */
export async function requireApiKey(request: NextRequest): Promise<ApiKeyContext> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) throw ApiError.unauthorized('API 키가 필요합니다.', 'invalid_api_key')

  const keyHash = createHash('sha256').update(auth.slice(7)).digest('hex')
  const service = createServiceClient()

  const { data } = await service
    .from('api_keys')
    .select('id, hotel_id')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (!data) throw ApiError.unauthorized('유효하지 않은 API 키입니다.', 'invalid_api_key')

  // 사용 시각 갱신은 비차단 — 실패해도 요청 처리에 영향을 주지 않는다.
  void service
    .from('api_keys')
    .update({ last_used: new Date().toISOString() })
    .eq('id', data.id)
    .then(undefined, () => {})

  return { hotelId: data.hotel_id, service: service as unknown as SupabaseClient }
}

// ── 크론 (Vercel Cron secret) ───────────────────────────────

/**
 * Vercel Cron 호출 검증. CRON_SECRET이 설정돼 있지 않으면 항상 거부한다
 * (미설정 상태에서 공개 엔드포인트가 되는 것을 막는다).
 */
export function requireCron(request: NextRequest): { service: SupabaseClient } {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    throw ApiError.unauthorized()
  }
  return { service: createServiceClient() as unknown as SupabaseClient }
}
