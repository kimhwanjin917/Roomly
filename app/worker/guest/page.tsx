import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireGuest } from '@/lib/auth'
import { fetchGuestAssignments } from '@/lib/guest-work'
import GuestDashboard from './GuestDashboard'

export const dynamic = 'force-dynamic'

export default async function GuestWorkerPage() {
  // requireGuest가 세션 + 코드 세대까지 확인한다.
  // 코드가 재발급됐으면 여기서 걸러져 새 QR로 다시 입장하게 된다.
  let ctx
  try {
    ctx = await requireGuest()
  } catch {
    redirect('/guest')
  }

  const assignments = await fetchGuestAssignments(ctx.service, ctx.hotelId)
  const token = cookies().get('roomly_guest_session')!.value

  return (
    <GuestDashboard
      hotelId={ctx.hotelId}
      staffName={ctx.staffName}
      initialAssignments={assignments as never}
      token={token}
    />
  )
}
