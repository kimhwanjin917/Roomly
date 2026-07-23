import { NextRequest, NextResponse } from 'next/server'

/**
 * API 에러 응답의 단일 출처.
 *
 * 라우트 핸들러는 실패 시 `throw ApiError.xxx(...)`를 던지고, `withApiError`가
 * `{ error, code, ...extra }` 형태의 JSON으로 직렬화한다.
 * 잡히지 않은 예외는 로깅 후 500 server_error로 변환된다.
 *
 * - `error`: 사용자에게 그대로 노출해도 되는 한국어 메시지
 * - `code` : 클라이언트 분기용 machine-readable 코드 (snake_case)
 */
export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly extra?: Record<string, unknown>

  constructor(status: number, code: string, message: string, extra?: Record<string, unknown>) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.extra = extra
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      { error: this.message, code: this.code, ...this.extra },
      { status: this.status },
    )
  }
}

/** 에러 대신 리다이렉트로 끝내야 하는 흐름(브라우저 콜백 등)에서 사용 */
export class HttpRedirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect: ${url}`)
    this.name = 'HttpRedirect'
    this.url = url
  }
}

export const ApiError = {
  badRequest: (msg = '잘못된 요청입니다.', code = 'invalid_request', extra?: Record<string, unknown>) =>
    new HttpError(400, code, msg, extra),
  unauthorized: (msg = '인증이 필요합니다.', code = 'unauthorized') =>
    new HttpError(401, code, msg),
  paymentRequired: (msg: string, code = 'payment_failed') =>
    new HttpError(402, code, msg),
  forbidden: (msg = '권한이 없습니다.', code = 'forbidden', extra?: Record<string, unknown>) =>
    new HttpError(403, code, msg, extra),
  notFound: (msg = '리소스를 찾을 수 없습니다.', code = 'not_found') =>
    new HttpError(404, code, msg),
  conflict: (msg: string, code = 'conflict', extra?: Record<string, unknown>) =>
    new HttpError(409, code, msg, extra),
  tooManyRequests: (msg = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', extra?: Record<string, unknown>) =>
    new HttpError(429, 'rate_limited', msg, extra),
  internal: (msg = '서버 오류가 발생했습니다.', code = 'server_error') =>
    new HttpError(500, code, msg),
  unavailable: (msg: string, code = 'service_unavailable') =>
    new HttpError(503, code, msg),
}

type Handler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<NextResponse> | NextResponse

/**
 * 라우트 핸들러 래퍼 — HttpError/HttpRedirect를 응답으로 변환하고,
 * 예상치 못한 예외는 로깅 후 500으로 감싼다.
 */
export function withApiError<Ctx = unknown>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof HttpError) return err.toResponse()
      if (err instanceof HttpRedirect) return NextResponse.redirect(err.url)

      console.error('[api]', req.method, req.nextUrl?.pathname, err)
      return ApiError.internal().toResponse()
    }
  }
}
