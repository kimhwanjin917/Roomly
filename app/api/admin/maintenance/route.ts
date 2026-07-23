import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withApiError } from '@/lib/api-error'

async function getHandler() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const service = createServiceClient()
  const { data } = await service
    .from('maintenance_requests')
    .select('*, rooms(number, floor), staff(name)')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

async function patchHandler(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const { id, status } = await request.json() as { id: string; status: string }

  const service = createServiceClient()
  const update: Record<string, unknown> = { status }
  if (status === 'resolved') update.resolved_at = new Date().toISOString()

  const { data, error } = await service
    .from('maintenance_requests')
    .update(update)
    .eq('id', id)
    .eq('hotel_id', hotelId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  return NextResponse.json(data)
}

export const GET = withApiError(getHandler)
export const PATCH = withApiError(patchHandler)
