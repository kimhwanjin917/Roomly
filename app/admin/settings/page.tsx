import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) redirect('/login')

  const service = createServiceClient()
  const { data: hotel } = await service.from('hotels').select('name').eq('id', hotelId).single()

  return <SettingsClient hotelId={hotelId} hotelName={hotel?.name ?? ''} />
}
