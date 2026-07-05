import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import * as jwt from 'jsonwebtoken'
import { NextIntlClientProvider } from 'next-intl'
import WorkerDashboard from './WorkerDashboard'

export default async function WorkerPage({ params }: { params: { staffId: string } }) {
  const cookieStore = cookies()
  const locale = cookieStore.get('roomly_locale')?.value ?? 'ko'
  const messages = (await import(`@/messages/${locale}.json`)).default
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
  if (staffId !== params.staffId) redirect('/login')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${sessionCookie.value}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )

  const [staffRes, assignRes] = await Promise.all([
    supabase.from('staff').select('name').eq('id', staffId).single(),
    supabase
      .from('assignments')
      .select('id, assigned_at, rooms(id, number, floor, type, status, checkin_time)')
      .eq('staff_id', staffId)
      .is('completed_at', null)
      .is('cancelled_at', null),
  ])

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <WorkerDashboard
        staffId={staffId}
        hotelId={hotelId}
        staffName={staffRes.data?.name ?? '직원'}
        initialAssignments={(assignRes.data ?? []) as any}
        token={sessionCookie.value}
      />
    </NextIntlClientProvider>
  )
}
