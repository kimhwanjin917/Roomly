import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import * as jwt from 'jsonwebtoken'
import { createServiceClient } from '@/lib/supabase/server'
import DirtyDashboard from './DirtyDashboard'

export default async function DirtyWorkerPage({ params }: { params: { staffId: string } }) {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('roomly_worker_session')
  if (!sessionCookie) redirect('/login')

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(sessionCookie.value, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    redirect('/login')
  }

  const staffId = payload.app_metadata?.staff_id as string
  const hotelId = payload.app_metadata?.hotel_id as string
  const workerRole = payload.app_metadata?.worker_role as string

  if (staffId !== params.staffId) redirect('/login')
  if (workerRole !== 'dirty') redirect(`/worker/${staffId}`)

  const service = createServiceClient()

  const [staffRes, roomsRes] = await Promise.all([
    service.from('staff').select('name').eq('id', staffId).single(),
    service
      .from('rooms')
      .select('id, number, floor, type, status')
      .eq('hotel_id', hotelId)
      .is('deleted_at', null)
      .order('floor')
      .order('number'),
  ])

  return (
    <DirtyDashboard
      staffId={staffId}
      hotelId={hotelId}
      staffName={staffRes.data?.name ?? '직원'}
      initialRooms={roomsRes.data ?? []}
      token={sessionCookie.value}
    />
  )
}
