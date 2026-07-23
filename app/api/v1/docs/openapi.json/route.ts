import { NextRequest, NextResponse } from 'next/server'
import { buildOpenApiSpec } from '@/lib/openapi'

// OpenAPI 스펙 JSON (T-203) — 공개 문서이므로 인증 불필요
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  return NextResponse.json(buildOpenApiSpec(baseUrl))
}
