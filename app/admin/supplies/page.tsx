import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SuppliesClient from './SuppliesClient'

export default async function SuppliesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) redirect('/login')

  const service = createServiceClient()
  const [suppliesRes, requestsRes] = await Promise.all([
    service.from('supplies').select('*').eq('hotel_id', hotelId).order('name'),
    service.from('supply_requests')
      .select('*, staff(name), rooms(number), supplies(name, unit)')
      .eq('hotel_id', hotelId)
      .order('requested_at', { ascending: false })
      .limit(50),
  ])

  return (
    <SuppliesClient
      hotelId={hotelId}
      initialSupplies={suppliesRes.data ?? []}
      initialRequests={(requestsRes.data ?? []) as any}
    />
  )
}
