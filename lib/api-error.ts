import { NextRequest, NextResponse } from 'next/server'

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>

export function withApiError(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      console.error('[withApiError]', err)
      return NextResponse.json({ error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' }, { status: 500 })
    }
  }
}

export const ApiError = {
  unauthorized: (msg = '인증이 필요합니다.') =>
    NextResponse.json({ error: msg, code: 'UNAUTHORIZED' }, { status: 401 }),
  forbidden: (msg = '권한이 없습니다.') =>
    NextResponse.json({ error: msg, code: 'FORBIDDEN' }, { status: 403 }),
  notFound: (msg = '리소스를 찾을 수 없습니다.') =>
    NextResponse.json({ error: msg, code: 'NOT_FOUND' }, { status: 404 }),
  badRequest: (msg: string) =>
    NextResponse.json({ error: msg, code: 'BAD_REQUEST' }, { status: 400 }),
  conflict: (msg: string) =>
    NextResponse.json({ error: msg, code: 'CONFLICT' }, { status: 409 }),
  tooManyRequests: () =>
    NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMITED' }, { status: 429 }),
  internal: (msg = '서버 오류가 발생했습니다.') =>
    NextResponse.json({ error: msg, code: 'INTERNAL_ERROR' }, { status: 500 }),
}
