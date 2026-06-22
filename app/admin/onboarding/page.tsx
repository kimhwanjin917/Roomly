import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingWizard from './OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hotelId = user.app_metadata?.hotel_id as string
  if (!hotelId) redirect('/login')

  const hotelRes = await supabase.from('hotels').select('name').eq('id', hotelId).single()

  // 이미 객실이 있으면 대시보드로
  const roomsRes = await supabase.from('rooms').select('id').eq('hotel_id', hotelId).is('deleted_at', null).limit(1)
  if ((roomsRes.data ?? []).length > 0) redirect('/admin')

  return <OnboardingWizard hotelId={hotelId} hotelName={hotelRes.data?.name ?? ''} />
}
