import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

// T-100: 쿠키 기반 로케일 — URL 구조(/worker/[staffId] QR 링크)를 바꾸지 않는다.
// 'locale' 쿠키를 우선 읽고, 기존 /api/worker/locale 라우트가 설정하는
// 'roomly_locale' 쿠키도 지원한다. 기본값은 'ko'.
const SUPPORTED_LOCALES = ['ko', 'en', 'vi'] as const

export default getRequestConfig(async () => {
  const cookieStore = cookies()
  const raw =
    cookieStore.get('locale')?.value ??
    cookieStore.get('roomly_locale')?.value ??
    'ko'
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(raw) ? raw : 'ko'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
