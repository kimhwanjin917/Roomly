import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import * as jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

const STAFF_ROLES = ['housekeeping', 'dirty'] as const
type StaffRole = (typeof STAFF_ROLES)[number]

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })

  const hotelId = user.app_metadata?.hotel_id as string
  const { name, phone_number, role } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'invalid_request', code: 'invalid_request' }, { status: 400 })

  const staffRole: StaffRole = STAFF_ROLES.includes(role) ? role : 'housekeeping'

  const authId = randomUUID()
  const service = createServiceClient()

  const { data: staff, error } = await service
    .from('staff')
    .insert({ hotel_id: hotelId, name: name.trim(), phone_number: phone_number ?? null, auth_id: authId, qr_version: 1, role: staffRole })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })

  const token = jwt.sign(
    {
      sub: authId,
      role: 'authenticated',
      iss: 'supabase',
      iat: Math.floor(Date.now() / 1000),
      app_metadata: {
        hotel_id: hotelId,
        role: 'worker',
        worker_role: staffRole,
        staff_id: staff.id,
        qr_version: 1,
      },
    },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: '30d' }
  )

  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/qr?token=${token}`
  return NextResponse.json({ staffId: staff.id, qrUrl })
}
