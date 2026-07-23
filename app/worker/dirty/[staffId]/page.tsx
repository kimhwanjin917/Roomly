import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import * as jwt from 'jsonwebtoken'
import DirtyDashboard from './DirtyDashboard'

export default async function DirtyWorkerPage({ params }: { params: { staffId: string } }) {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('roomly_worker_session')
  if (!sessionCookie) redirect('/login')

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(sessionCookie.value, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) redirect('/login?error=session_expired')
    redirect('/login')
  }

  const staffId = payload.app_metadata?.staff_id as string
  const hotelId = payload.app_metadata?.hotel_id as string
  const workerRole = payload.app_metadata?.worker_role as string | undefined
  if (staffId !== params.staffId) redirect('/login')
  if (workerRole !== 'dirty') redirect(`/worker/${staffId}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${sessionCookie.value}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )

  const [staffRes, roomsRes] = await Promise.all([
    supabase.from('staff').select('name').eq('id', staffId).single(),
    supabase
      .from('rooms')
      .select('id, number, floor, type, status, checkin_time')
      .is('deleted_at', null)
      .order('floor')
      .order('number'),
  ])

  return (
    <DirtyDashboard
      staffId={staffId}
      hotelId={hotelId}
      staffName={staffRes.data?.name ?? '직원'}
      initialRooms={(roomsRes.data ?? []) as any}
      token={sessionCookie.value}
    />
  )
}
