import jwt from 'jsonwebtoken'

// T-205: FCM HTTP v1 발송 — firebase-admin 대신 서비스 계정 키로 직접 OAuth2 토큰을 발급한다.
// 환경 변수 셋이 없으면 fcmInitialized=false로 발송을 스킵한다 (Web Push의 vapidInitialized 패턴).
const FCM_PROJECT_ID = process.env.FIREBASE_PROJECT_ID
const FCM_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL
const FCM_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

export const fcmInitialized = !!(FCM_PROJECT_ID && FCM_CLIENT_EMAIL && FCM_PRIVATE_KEY)

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const assertion = jwt.sign(
    {
      iss: FCM_CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
    },
    FCM_PRIVATE_KEY!,
    { algorithm: 'RS256', expiresIn: '1h' },
  )

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!res.ok) throw new Error(`FCM OAuth 토큰 발급 실패: ${res.status}`)

  const data = await res.json() as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

interface FcmPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

// 발송 결과: 'ok' | 'gone'(토큰 무효 — 구독 삭제 필요) | 'error'
export async function sendFcm(fcmToken: string, payload: FcmPayload): Promise<'ok' | 'gone' | 'error'> {
  if (!fcmInitialized) return 'error'

  const accessToken = await getAccessToken()
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title: payload.title, body: payload.body },
          data: { url: payload.url ?? '/', tag: payload.tag ?? '' },
          android: {
            priority: 'HIGH',
            notification: payload.tag ? { tag: payload.tag } : undefined,
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default' } },
          },
        },
      }),
    },
  )

  if (res.ok) return 'ok'
  // 404 UNREGISTERED / 400 INVALID_ARGUMENT(만료 토큰) → 구독 정리 대상
  if (res.status === 404 || res.status === 400) return 'gone'
  return 'error'
}
