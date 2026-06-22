import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import * as jwt from 'jsonwebtoken'
import GuestDashboard from './GuestDashboard'

export default async function GuestWorkerPage() {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('roomly_guest_session')
  if (!sessionCookie) redirect('/guest')

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(sessionCookie.value, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    redirect('/guest')
  }

  const hotelId = payload.app_metadata?.hotel_id as string

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${sessionCookie.value}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, assigned_at, rooms(id, number, floor, type, status, checkin_time)')
    .eq('is_guest', true)
    .is('completed_at', null)
    .is('cancelled_at', null)

  return <GuestDashboard hotelId={hotelId} initialAssignments={(assignments ?? []) as any} token={sessionCookie.value} />
}
