import { NextResponse } from 'next/server'
import { buildOpenApiSpec } from '@/lib/openapi'
import { appUrl } from '@/lib/constants'

// OpenAPI 스펙 JSON (T-203) — 공개 문서이므로 인증 불필요
export async function GET() {
  return NextResponse.json(buildOpenApiSpec(appUrl()))
}
