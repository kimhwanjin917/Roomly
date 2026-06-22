import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const vapidInitialized = !!(
  process.env.VAPID_PRIVATE_KEY &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_EMAIL
)

if (vapidInitialized) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function sendPushToStaff(staffId: string, payload: PushPayload) {
  if (!vapidInitialized) return

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('staff_id', staffId)

  if (!subs?.length) return

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
    } catch (err: any) {
      if (err.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
}

export async function sendPushToAdmin(hotelId: string, payload: PushPayload) {
  if (!vapidInitialized) return

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_admin', true)

  if (!subs?.length) return

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
    } catch (err: any) {
      if (err.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
}
