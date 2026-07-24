import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffClient from './StaffClient'

export default async function StaffPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) redirect('/login')

  const service = createServiceClient()
  const { data: staffList } = await service
    .from('staff')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('name')

  return <StaffClient hotelId={hotelId} initialStaffList={staffList ?? []} />
}
