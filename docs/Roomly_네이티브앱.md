# Roomly 네이티브 앱 가이드 (T-204 / T-205 / T-206)

> 2026-07-09 작성. Capacitor 8 기반 Android/iOS 래퍼 앱.
> Next.js가 SSR이라 정적 export가 불가능하므로 **리모트 URL 방식**을 쓴다 —
> 네이티브 앱은 배포된 웹앱(`https://roomly-plum-eight.vercel.app`)을 WebView로 감싸고,
> 푸시 알림만 네이티브(FCM/APNs)로 처리한다.

---

## 1. 구조 (T-204)

| 경로 | 역할 |
|---|---|
| `capacitor.config.ts` | 앱 ID `com.roomly.app`, `server.url` 리모트 설정 |
| `capacitor-shell/` | 네트워크 실패 시에만 보이는 오프라인 폴백 셸 (webDir) |
| `android/`, `ios/` | 네이티브 프로젝트 (커밋 대상 — 빌드 산출물은 gitignore) |
| `lib/native-push.ts` | 클라이언트: 주입된 Capacitor 브리지로 FCM 토큰 등록 |
| `lib/fcm.ts` | 서버: FCM HTTP v1 발송 (서비스 계정 키 → OAuth2) |
| `supabase/migrations/016_native_push.sql` | `push_subscriptions.platform`/`fcm_token` 컬럼 |
| `scripts/sync-native-version.mjs` | package.json 버전 → Android/iOS 동기화 |
| `assets/logo.png` | 아이콘/스플래시 소스 (scripts/generate-icons.js가 생성) |

**리모트 URL 방식의 함의**
- 웹 배포(Vercel push)만으로 앱 내용이 갱신된다 — 스토어 재심사 불필요.
- 네이티브 코드는 `window.Capacitor` 브리지로만 접근한다 (`lib/native-push.ts`).
  npm `@capacitor/*` 패키지를 웹 번들에서 import하지 않는다.
- 스테이징을 가리키려면 `CAP_SERVER_URL` 환경변수를 주고 `npm run cap:sync`.

### npm 스크립트
```bash
npm run cap:sync           # 버전 동기화 + cap sync (네이티브 작업 전 항상 실행)
npm run cap:assets         # 아이콘/스플래시 재생성 (assets/logo.png 변경 시)
npm run cap:android        # Android Studio 열기
npm run cap:ios            # Xcode 열기 (macOS 전용)
npm run cap:build:android  # AAB 릴리스 빌드 (키스토어 설정 후)
```

### 로컬 빌드 요구사항
- **Android**: Android Studio (JDK 17 포함 — 시스템 Java 8로는 Gradle 빌드 불가, Android Studio 내장 JDK 사용)
- **iOS**: macOS + Xcode 15+. Windows에서는 스캐폴딩만 가능하고 빌드/서명은 macOS에서.
  macOS에서 최초 1회: `cd ios/App && pod install`

---

## 2. 네이티브 푸시 — FCM (T-205)

### 동작 방식
1. 네이티브 앱에서 벨 버튼 → `lib/native-push.ts`가 권한 요청 → `PushNotifications.register()` → FCM 토큰 수신
2. `POST /api/push/subscribe`에 `{ fcmToken, staffId|isAdmin, hotelId }` 전송
   → `push_subscriptions`에 `platform='fcm'`, `endpoint='fcm:{token}'`으로 저장
3. 서버 발송(`lib/push.ts`)은 구독의 `platform`에 따라 분기:
   - `web` → 기존 Web Push (VAPID)
   - `fcm` → `lib/fcm.ts` (FCM HTTP v1, 토큰 무효 시 구독 자동 삭제)

### Firebase 설정 (최초 1회)
1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성 (예: `roomly-prod`)
2. **Android 앱 추가**: 패키지명 `com.roomly.app` → `google-services.json` 다운로드
   → `android/app/google-services.json`에 배치 (**gitignore됨 — 커밋 금지**)
3. **iOS 앱 추가**: 번들 ID `com.roomly.app` → `GoogleService-Info.plist` 다운로드
   → Xcode에서 `ios/App/App/`에 추가 (gitignore됨)
4. **서버 키**: 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" JSON에서 아래 3개를
   Vercel 환경변수로 설정:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (JSON의 `private_key` 값 그대로 — `\n` 포함 문자열)

환경변수가 없으면 FCM 발송만 조용히 스킵되고 Web Push는 정상 동작한다.

### iOS 추가 작업 (macOS에서)
- Xcode → Signing & Capabilities → **Push Notifications** capability 추가
- Apple Developer → Keys에서 **APNs 인증 키(.p8)** 생성 → Firebase 프로젝트 설정 →
  클라우드 메시징 → Apple 앱 구성에 업로드
- iOS에서 FCM 토큰을 받으려면 Firebase iOS SDK 연동이 필요:
  `ios/App/Podfile`에 `pod 'FirebaseMessaging'` 추가 후 [Capacitor 공식 가이드](https://capacitorjs.com/docs/apis/push-notifications#ios)의
  `AppDelegate.swift` 스니펫 적용 (APNs 토큰 → FCM 토큰 변환)

### DB 마이그레이션
프로덕션 Supabase에 `016_native_push.sql` 실행 필요 (컬럼 추가 + p256dh/auth NOT NULL 해제).

---

## 3. 스토어 배포 준비 (T-206)

### 앱 아이콘 / 스플래시
`assets/logo.png`(1024×1024)에서 `npm run cap:assets`로 Android/iOS 리소스 자동 생성.
브랜드 로고가 확정되면 `assets/logo.png`만 교체하고 다시 실행한다.
(주의: capacitor-assets가 `public/manifest.json`과 PWA 아이콘을 덮어쓸 수 있다 —
실행 후 `git diff public/`을 확인하고 원치 않는 변경은 되돌릴 것.)

### 버전 관리
- 버전의 원천은 `package.json`의 `version` (semver).
- `npm run cap:sync`가 Android `versionName`/`versionCode`,
  iOS `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`을 자동 반영.
- `versionCode` = major×10000 + minor×100 + patch (예: 1.2.3 → 10203). 릴리스마다 버전을 올릴 것.

### Android — Play Store
1. **키스토어 생성** (최초 1회, 분실 시 앱 업데이트 불가 — 안전한 곳에 백업):
   ```bash
   keytool -genkey -v -keystore roomly-release.jks -alias roomly \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. `android/keystore.properties` 생성 (gitignore 대상 `*.jks`와 함께 커밋 금지):
   ```properties
   storeFile=../roomly-release.jks
   storePassword=...
   keyAlias=roomly
   keyPassword=...
   ```
   `android/app/build.gradle`의 `signingConfigs`에 연결 ([공식 가이드](https://developer.android.com/studio/publish/app-signing)).
3. 빌드: `npm run cap:build:android` → `android/app/build/outputs/bundle/release/app-release.aab`
4. [Play Console](https://play.google.com/console): 개발자 계정($25) → 앱 생성 →
   프로덕션 트랙에 AAB 업로드 → 스토어 등록정보(스크린샷, 그래픽, 설명) → 심사 제출
5. 데이터 보안 양식: 수집 항목 = 이름/전화번호(직원), 결제정보(Toss 위임), 푸시 토큰

### iOS — App Store (macOS 필요)
1. Apple Developer Program 가입 ($99/년)
2. Xcode → Signing & Capabilities: Team 선택, Bundle ID `com.roomly.app` 자동 프로비저닝
3. capability: Push Notifications 추가 (위 2절)
4. `npm run cap:ios` → Xcode에서 Product → Archive → App Store Connect 업로드
5. App Store Connect: 앱 등록 → 스크린샷/설명 → 심사 제출
   - 심사용 데모 계정 준비 (관리자 계정 + 직원 QR 링크)
   - 리모트 URL 래퍼는 4.2(최소 기능) 리젝 가능성이 있음 — 푸시 알림·홈스크린 통합이
     네이티브 가치라는 점을 심사 노트에 명시

### 출시 전 체크리스트
- [ ] 프로덕션 Supabase에 `016_native_push.sql` 적용
- [ ] Firebase 프로젝트 + `google-services.json` / `GoogleService-Info.plist` 배치
- [ ] Vercel에 `FIREBASE_*` 환경변수 3종 설정
- [ ] 커스텀 도메인 확정 시 `capacitor.config.ts`의 `server.url` 변경 후 재빌드
- [ ] Android 실기기에서: QR 로그인 → 벨 버튼 → 배정 시 푸시 수신 확인
- [ ] 키스토어/.p8 키 오프사이트 백업
