# Roomly PWA — 호텔 하우스키핑 구현 가이드

> 목적: 청소팀이 스마트폰에서 네이티브 앱처럼 사용하도록 한다. 홈 화면 설치, 오프라인 조회, 배정 즉시 푸시 알림.

---

## 1. 왜 PWA인가

| 기준 | 네이티브 앱 | PWA |
|------|------------|-----|
| 설치 방법 | 앱스토어 심사 필요 | URL 접속 → "홈 화면에 추가" |
| 업데이트 | 스토어 재배포 | 코드 배포 즉시 반영 |
| 푸시 알림 | 가능 | 가능 (Android 전체, iOS 16.4+) |
| 오프라인 | 가능 | 서비스 워커로 가능 |
| 개발 비용 | iOS + Android 별도 | 웹 1벌 |

**결론:** 청소팀은 하루에 수십 번 앱을 열고 닫는다. 설치 마찰을 없애고 배정 알림을 받는 게 핵심이다.

---

## 2. 현재 구현 상태 (2026-06-22)

```
✅ 서비스 워커       next-pwa v5 (workbox) — 빌드 시 자동 생성
✅ 오프라인 폴백      /offline 페이지
✅ 홈 화면 설치       manifest.json + apple-touch-icon.png
✅ 캐시 전략          StaleWhileRevalidate (직원·관리자 페이지 + API)
✅ 푸시 수신 핸들러   worker/index.js → SW에 번들
✅ 푸시 구독 API      POST /api/push/subscribe
✅ 배정 시 푸시 발송  POST /api/admin/assign → lib/push.ts
⬜ 푸시 발송 활성화   아래 환경변수 설정 필요
⬜ iOS 푸시           iOS 16.4+ Safari 전용 설정 (3절 참고)
```

---

## 3. 푸시 알림 초기 설정

### 3-1. VAPID 키 생성

```bash
npx web-push generate-vapid-keys
```

출력 예시:
```
Public Key: BGxxxxxxxxx...
Private Key: xxxxxxxxx...
```

### 3-2. 환경변수 등록

`.env.local` (로컬) 및 Vercel 환경변수:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BGxxxxxxxxx...
VAPID_PRIVATE_KEY=xxxxxxxxx...
VAPID_EMAIL=mailto:admin@yourdomain.com
```

> `NEXT_PUBLIC_VAPID_PUBLIC_KEY`는 브라우저에서 구독 시 사용하므로 반드시 `NEXT_PUBLIC_` 접두사가 붙어야 한다.

### 3-3. DB 테이블 확인

`push_subscriptions` 테이블은 DB 스키마에 이미 포함되어 있다.  
아직 생성하지 않았다면 `Roomly_DB스키마.md` 의 DDL 섹션 7번을 실행한다.

### 3-4. 빌드 재실행

서비스 워커에 푸시 핸들러(`worker/index.js`)가 반영되려면 반드시 빌드 후 배포한다:

```bash
npm run build
```

> 개발 모드(`npm run dev`)에서는 서비스 워커가 비활성화(`disable: process.env.NODE_ENV === 'development'`)되어 있어 푸시가 동작하지 않는다. Vercel Preview 배포로 테스트할 것.

---

## 4. 푸시 알림 흐름 (end-to-end)

```
[관리자] 객실 배정
   └─▶ POST /api/admin/assign
         ├─ assignment 생성 (DB)
         └─ sendPushToStaff() → web-push 라이브러리
                                  └─▶ 직원 브라우저 / SW
                                        └─▶ 알림 표시
                                              └─▶ 클릭 → /worker/{staffId} 포커스

[직원] 최초 앱 접근 (/worker/[staffId])
   └─▶ WorkerDashboard 마운트
         └─▶ 현재 알림 권한 상태만 읽기 (자동 요청 X)
               └─▶ 헤더 벨 버튼 표시 (idle/subscribed/denied)
                     └─▶ 직원이 벨 버튼 클릭
                           └─▶ Notification.requestPermission()
                                 └─▶ 허용 시 → pushManager.subscribe()
                                       └─▶ POST /api/push/subscribe (서버에 구독 저장)
```

---

## 5. 캐시 전략

| 경로 | 전략 | 캐시 유효 기간 | 이유 |
|------|------|----------------|------|
| `/worker/*` | StaleWhileRevalidate | 24시간 | 오프라인에서도 배정 목록 표시. Realtime이 최신화 담당 |
| `/guest` | StaleWhileRevalidate | 24시간 | 코드 입력 화면 오프라인 접근 가능 |
| `/admin/*` | StaleWhileRevalidate | 24시간 | 관리자 대시보드 오프라인 조회 |
| `/api/worker/assignments` | StaleWhileRevalidate | 1시간 | API 오프라인 폴백 |
| `/api/guest/assignments` | StaleWhileRevalidate | 1시간 | API 오프라인 폴백 |
| POST/DELETE 요청 | 캐시 없음 | — | 상태 변경은 반드시 서버 도달 필요 |

> **주의:** 청소 상태 변경(POST /api/worker/status)이 오프라인 중 실패하면 토스트 에러가 표시된다. Background Sync(Phase 2 예정)로 개선 가능.

---

## 6. 오프라인 동작

| 상황 | 동작 |
|------|------|
| 직원이 앱 열 때 인터넷 없음 | 캐시에서 배정 목록 표시 |
| 직원이 "청소 시작" 버튼 클릭 | 서버 요청 실패 → 에러 토스트 |
| 직원이 완전히 오프라인 | `/offline` 폴백 페이지 표시 |
| 연결 복구 | 자동 감지 → 이전 페이지로 돌아감 |

---

## 7. iOS 특이사항

- **iOS 16.4 이상 Safari** 에서 "홈 화면에 추가"한 PWA만 푸시 알림 수신 가능
- 반드시 **홈 화면 설치 후** 알림 권한 요청이 동작함 (브라우저 Safari에서는 불가)
- 테스트: Safari → 공유 버튼 → "홈 화면에 추가" → 앱 실행 → 알림 허용

---

## 8. 홈 화면 설치 안내 (UX)

현재 미구현. 향후 추가 권장:
- 직원이 처음 접속 시 "홈 화면에 추가하면 알림을 받을 수 있습니다" 배너 표시
- `beforeinstallprompt` 이벤트 캡처 (Android Chrome)
- iOS는 자동 프롬프트 불가 → 수동 안내 팝업

```tsx
// 추가할 컴포넌트 (WorkerDashboard 또는 별도 banner)
useEffect(() => {
  const handler = (e: Event) => {
    e.preventDefault()
    setInstallPrompt(e as BeforeInstallPromptEvent)
  }
  window.addEventListener('beforeinstallprompt', handler)
  return () => window.removeEventListener('beforeinstallprompt', handler)
}, [])
```

---

## 9. 파일 구조

```
Roomly/
├── public/
│   ├── manifest.json          # Web App Manifest
│   ├── sw.js                  # next-pwa 빌드 생성 (직접 수정 금지)
│   ├── workbox-*.js           # Workbox 런타임
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
│
├── worker/
│   └── index.js               # 커스텀 SW 코드 (push, notificationclick 핸들러)
│                              # next build 시 sw.js에 번들됨
│
├── app/
│   ├── offline/page.tsx       # 오프라인 폴백 페이지
│   └── api/push/subscribe/
│       └── route.ts           # 푸시 구독 저장/삭제 API
│
├── lib/
│   └── push.ts                # web-push 유틸리티 (sendPushToStaff)
│
└── next.config.js             # withPWA 설정 (customWorkerDir: 'worker' 포함)
```

---

## 10. 향후 개선 (Phase 2)

- **Background Sync**: 오프라인 중 청소 완료 버튼 → 온라인 복구 후 자동 재전송
- **홈 화면 설치 프롬프트 배너**: 미설치 직원에게 설치 유도
- **알림 배지**: 배정된 방 수를 앱 아이콘에 표시 (Android Chrome)
- **알림 그룹화**: 여러 방이 연속 배정될 때 단일 알림으로 묶기 (`tag` 재사용)
- **관리자 푸시**: 긴급 알림(체크인 2시간 전 미청소) → 관리자 기기로 발송
