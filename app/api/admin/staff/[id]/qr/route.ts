import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'

async function getStaff(staffId: string, hotelId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from('staff')
    .select('id, auth_id, qr_version, role')
    .eq('id', staffId)
    .eq('hotel_id', hotelId)
    .single()
  return data
}

function makeToken(staff: { auth_id: string; qr_version: number; id: string; role: string }, hotelId: string) {
  return jwt.sign(
    {
      sub: staff.auth_id,
      role: 'authenticated',
      iss: 'supabase',
      iat: Math.floor(Date.now() / 1000),
      app_metadata: {
        hotel_id: hotelId,
        role: 'worker',
        worker_role: staff.role ?? 'housekeeping',
        staff_id: staff.id,
        qr_version: staff.qr_version,
      },
    },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: '30d' }
  )
}

// GET — view current QR without regenerating
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const staff = await getStaff(params.id, hotelId)
  if (!staff) return NextResponse.json({ error: 'forbidden', code: 'forbidden' }, { status: 403 })

  const token = makeToken(staff, hotelId)
  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/qr?token=${token}`
  return NextResponse.json({ qrUrl })
}

// POST — increment qr_version and return new QR (invalidates old one)
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const service = createServiceClient()

  const staff = await getStaff(params.id, hotelId)
  if (!staff) return NextResponse.json({ error: 'forbidden', code: 'forbidden' }, { status: 403 })

  const newVersion = staff.qr_version + 1
  await service.from('staff').update({ qr_version: newVersion }).eq('id', params.id)

  const token = makeToken({ ...staff, qr_version: newVersion }, hotelId)
  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/qr?token=${token}`
  return NextResponse.json({ qrUrl })
}
