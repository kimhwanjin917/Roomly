import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) redirect('/login')

  const [hotelRes, roomsRes, assignmentsRes, staffRes] = await Promise.all([
    supabase.from('hotels').select('name').eq('id', hotelId).single(),
    supabase.from('rooms').select('*').eq('hotel_id', hotelId).is('deleted_at', null).order('floor').order('number'),
    supabase.from('assignments').select('id, room_id, staff_id, is_guest, assigned_at, staff(id, name)').is('completed_at', null).is('cancelled_at', null),
    supabase.from('staff').select('id, name').eq('hotel_id', hotelId).order('name'),
  ])

  // 신규 호텔 — 객실이 하나도 없으면 온보딩으로 이동
  if ((roomsRes.data ?? []).length === 0) redirect('/admin/onboarding')

  return (
    <AdminDashboard
      hotelId={hotelId}
      hotelName={hotelRes.data?.name ?? ''}
      initialRooms={roomsRes.data ?? []}
      initialAssignments={(assignmentsRes.data ?? []) as any}
      staffList={staffRes.data ?? []}
    />
  )
}
