import type { CapacitorConfig } from '@capacitor/cli'

// T-204: 네이티브 앱은 배포된 웹앱을 감싸는 리모트 URL 방식.
// Next.js SSR이라 정적 export가 불가능하므로 webDir은 오프라인 폴백 셸만 담는다.
const config: CapacitorConfig = {
  appId: 'com.roomly.app',
  appName: 'Roomly',
  webDir: 'capacitor-shell',
  server: {
    url: process.env.CAP_SERVER_URL || 'https://roomly-plum-eight.vercel.app',
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
