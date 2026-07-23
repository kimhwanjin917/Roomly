import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { sendFcm, fcmInitialized } from './fcm'

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

interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string | null
  auth: string | null
  platform: string | null
  fcm_token: string | null
}

// T-205: 구독 platform에 따라 Web Push(VAPID) / FCM(네이티브 앱) 분기 발송
async function sendToSubscription(sub: PushSubscriptionRow, payload: PushPayload) {
  if (sub.platform === 'fcm') {
    if (!fcmInitialized || !sub.fcm_token) return
    try {
      const result = await sendFcm(sub.fcm_token, payload)
      if (result === 'gone') {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    } catch {
      // FCM 발송 실패는 무시 (비차단)
    }
    return
  }

  if (!vapidInitialized || !sub.p256dh || !sub.auth) return
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

export async function sendPushToStaff(staffId: string, payload: PushPayload) {
  if (!vapidInitialized && !fcmInitialized) return

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('staff_id', staffId)

  if (!subs?.length) return

  for (const sub of subs) {
    await sendToSubscription(sub, payload)
  }
}

export async function sendPushToAdmin(hotelId: string, payload: PushPayload) {
  if (!vapidInitialized && !fcmInitialized) return

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_admin', true)

  if (!subs?.length) return

  for (const sub of subs) {
    await sendToSubscription(sub, payload)
  }
}
