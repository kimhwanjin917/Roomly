import { NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'

/**
 * API 에러 응답 표준 (T-084)
 * 형식: { error: string(사람이 읽는 메시지), code: string(기계용 코드) }
 */
export type ApiErrorBody = {
  error: string
  code: string
  [key: string]: unknown
}

/** 일관된 형식의 에러 응답을 생성한다. */
export function apiError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, code, ...extra }, { status })
}

/** Supabase PostgrestError 형태인지 판별 */
function isPostgrestError(e: unknown): e is { code: string; message: string } {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as Record<string, unknown>).code === 'string' &&
    typeof (e as Record<string, unknown>).message === 'string'
  )
}

/**
 * 알 수 없는 예외를 표준 에러 응답으로 매핑한다.
 * - jwt.TokenExpiredError → 401 session_expired
 * - jwt.JsonWebTokenError → 401 invalid_token
 * - Supabase(Postgrest) 에러 → 500 db_error (unique 위반은 409 duplicate)
 * - 그 외 → 500 internal
 */
export function handleApiError(e: unknown): NextResponse<ApiErrorBody> {
  // TokenExpiredError는 JsonWebTokenError를 상속하므로 먼저 검사
  if (e instanceof jwt.TokenExpiredError) {
    return apiError(401, 'session_expired', '세션이 만료되었습니다.')
  }
  if (e instanceof jwt.JsonWebTokenError) {
    return apiError(401, 'invalid_token', '유효하지 않은 토큰입니다.')
  }
  if (isPostgrestError(e)) {
    if (e.code === '23505') {
      return apiError(409, 'duplicate', '이미 존재하는 데이터입니다.')
    }
    return apiError(500, 'db_error', '데이터베이스 오류가 발생했습니다.')
  }
  return apiError(500, 'internal', '서버 오류가 발생했습니다.')
}
