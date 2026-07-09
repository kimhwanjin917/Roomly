// T-205: Capacitor 네이티브 앱 푸시 헬퍼 (클라이언트 전용)
// 네이티브 앱은 server.url 리모트 방식이라 Capacitor 브리지가 WebView에 주입된다.
// npm 패키지를 import하지 않고 주입된 window.Capacitor를 통해 플러그인을 호출한다.

const FCM_TOKEN_KEY = 'roomly_fcm_token'

interface CapacitorBridge {
  isNativePlatform?: () => boolean
  Plugins?: {
    PushNotifications?: {
      checkPermissions: () => Promise<{ receive: string }>
      requestPermissions: () => Promise<{ receive: string }>
      register: () => Promise<void>
      unregister: () => Promise<void>
      addListener: (event: string, cb: (data: { value?: string; error?: string }) => void) => Promise<{ remove: () => void }>
      removeAllListeners: () => Promise<void>
    }
  }
}

function getBridge(): CapacitorBridge | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor ?? null
}

export function isNativeApp(): boolean {
  return getBridge()?.isNativePlatform?.() === true
}

export type NativePushPermission = 'granted' | 'denied' | 'prompt'

export async function getNativePushPermission(): Promise<NativePushPermission> {
  const push = getBridge()?.Plugins?.PushNotifications
  if (!push) return 'denied'
  const { receive } = await push.checkPermissions()
  if (receive === 'granted') return 'granted'
  if (receive === 'denied') return 'denied'
  return 'prompt'
}

export function hasNativeFcmToken(): boolean {
  return !!localStorage.getItem(FCM_TOKEN_KEY)
}

// 권한 요청 → FCM 토큰 등록 → 서버 구독 저장. 성공 시 true.
export async function subscribeNativePush(body: {
  staffId?: string
  isAdmin?: boolean
  hotelId: string
}): Promise<boolean> {
  const push = getBridge()?.Plugins?.PushNotifications
  if (!push) return false

  let { receive } = await push.checkPermissions()
  if (receive !== 'granted') {
    ({ receive } = await push.requestPermissions())
  }
  if (receive !== 'granted') return false

  // register()는 비동기 이벤트로 토큰을 돌려주므로 Promise로 감싼다
  const token = await new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), 10_000)
    push.addListener('registration', ({ value }) => {
      clearTimeout(timer)
      resolve(value ?? null)
    })
    push.addListener('registrationError', () => {
      clearTimeout(timer)
      resolve(null)
    })
    push.register().catch(() => {
      clearTimeout(timer)
      resolve(null)
    })
  })
  await push.removeAllListeners()

  if (!token) return false

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcmToken: token, ...body }),
  })
  if (!res.ok) return false

  localStorage.setItem(FCM_TOKEN_KEY, token)
  return true
}

export async function unsubscribeNativePush(): Promise<void> {
  const token = localStorage.getItem(FCM_TOKEN_KEY)
  if (token) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcmToken: token }),
    })
    localStorage.removeItem(FCM_TOKEN_KEY)
  }
  const push = getBridge()?.Plugins?.PushNotifications
  await push?.unregister?.().catch(() => {})
}
