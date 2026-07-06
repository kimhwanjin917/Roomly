import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const service = createServiceClient()
  const { data } = await service.from('supplies').select('*').eq('hotel_id', hotelId).order('name')
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const body = await request.json()
  const service = createServiceClient()
  const { data, error } = await service.from('supplies').insert({ ...body, hotel_id: hotelId }).select().single()
  if (error) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  const hotelId = user.app_metadata?.hotel_id as string

  const body = await request.json()
  const { id, ...rest } = body
  const service = createServiceClient()
  const { data, error } = await service.from('supplies').update(rest).eq('id', id).eq('hotel_id', hotelId).select().single()
  if (error) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  return NextResponse.json(data)
}
