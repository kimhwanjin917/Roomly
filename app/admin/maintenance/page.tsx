import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MaintenanceClient from './MaintenanceClient'

export default async function MaintenancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) redirect('/login')

  const service = createServiceClient()
  const { data: items } = await service
    .from('maintenance_requests')
    .select('*, staff(name), rooms(number, floor)')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })

  return <MaintenanceClient hotelId={hotelId} initialItems={(items ?? []) as any} />
}
