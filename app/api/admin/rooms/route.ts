import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

async function postHandler(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const { number, floor, type } = await request.json()
  if (!number?.trim() || !floor) return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('rooms')
    .insert({ hotel_id: hotelId, number: number.trim(), floor: Number(floor), type })
    .select('id, number, floor, type')
    .single()

  if (error) {
    console.error('[rooms POST]', error)
    if (error.code === '23505') return NextResponse.json({ error: 'duplicate', code: 'duplicate' }, { status: 409 })
    return NextResponse.json({ error: 'server_error', detail: error.message, code: error.code }, { status: 500 })
  }

  return NextResponse.json(data)
}

export const POST = withApiError(postHandler)
