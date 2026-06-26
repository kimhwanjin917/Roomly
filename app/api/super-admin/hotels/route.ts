import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifySuperAdminToken } from '@/lib/super-admin-auth'

function verifySession() {
  const cookieStore = cookies()
  const token = cookieStore.get('super_admin_session')?.value
  if (!token) return false
  return verifySuperAdminToken(token)
}

export async function GET() {
  if (!verifySession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: hotels } = await supabaseAdmin
    .from('hotels')
    .select('id, name, subscription_plan, created_at')
    .order('created_at', { ascending: false })

  const { data: rooms } = await supabaseAdmin
    .from('rooms')
    .select('hotel_id')
    .is('deleted_at', null)

  const roomCounts = (rooms ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.hotel_id] = (acc[r.hotel_id] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    hotels: (hotels ?? []).map(h => ({
      ...h,
      roomCount: roomCounts[h.id] ?? 0,
    })),
  })
}
