import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { verifySuperAdminToken } from '@/lib/super-admin-auth'

function verifySession() {
  const cookieStore = cookies()
  const token = cookieStore.get('super_admin_session')?.value
  if (!token) return false
  return verifySuperAdminToken(token)
}

function createAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST() {
  if (!verifySession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const part1 = randomBytes(3).toString('hex').toUpperCase()
  const part2 = randomBytes(3).toString('hex').toUpperCase()
  const key = `ROOMLY-${part1}-${part2}`

  const { error } = await createAdmin().from('licenses').insert({ key })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ key })
}

export async function GET() {
  if (!verifySession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await createAdmin()
    .from('licenses')
    .select('id, key, created_at, used_at, hotel_id')
    .order('created_at', { ascending: false })

  return NextResponse.json({ licenses: data ?? [] })
}
