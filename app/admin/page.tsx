import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) redirect('/login')

  const service = createServiceClient()

  const [hotelRes, roomsRes, assignmentsRes, staffRes] = await Promise.all([
    service.from('hotels').select('name, checkin_alert_minutes, subscription_plan, trial_ends_at').eq('id', hotelId).single(),
    service.from('rooms').select('*').eq('hotel_id', hotelId).is('deleted_at', null).order('floor').order('number'),
    service.from('assignments').select('id, room_id, staff_id, is_guest, assigned_at, staff(id, name)').is('completed_at', null).is('cancelled_at', null),
    service.from('staff').select('id, name').eq('hotel_id', hotelId).order('name'),
  ])

  return (
    <AdminDashboard
      hotelId={hotelId}
      hotelName={hotelRes.data?.name ?? ''}
      checkinAlertMinutes={hotelRes.data?.checkin_alert_minutes ?? 120}
      subscriptionPlan={hotelRes.data?.subscription_plan ?? 'trial'}
      trialEndsAt={hotelRes.data?.trial_ends_at ?? null}
      initialRooms={roomsRes.data ?? []}
      initialAssignments={(assignmentsRes.data ?? []) as any}
      staffList={staffRes.data ?? []}
    />
  )
}
