# Roomly 제품 로드맵

> 텔레그램 단톡방을 대체하는 호텔 하우스키핑 OS.  
> Phase 1은 완료. 이 문서는 Phase 2·3의 전체 설계를 담는다.

---

## 현재 상태 (Phase 1 — 완료)

### 완성된 것
| 화면 / 기능 | 상태 |
|---|---|
| 관리자 로그인 (`/login`) | ✅ |
| 라이선스 기반 가입 (`/signup`) | ✅ |
| 객실 현황판 — 실시간, 긴급 표시 (`/admin`) | ✅ |
| 객실 CRUD (`/admin/rooms`) | ✅ |
| 직원 관리 + QR 발급 (`/admin/staff`) | ✅ |
| 일일 통계 (`/admin/stats`) | ✅ |
| 게스트 코드 접속 (`/guest`) | ✅ |
| 직원 청소 화면 — 실시간 (`/worker/[staffId]`) | ✅ |
| 게스트 청소 화면 (`/worker/guest`) | ✅ |
| 온보딩 마법사 (`/admin/onboarding`) | ✅ |
| PWA (홈 화면 설치, 오프라인 캐시) | ✅ |
| RLS 멀티테넌시 보안 | ✅ |

### 아직 없는 것 (Phase 1 잔여 — 소규모 마감)
- 오프라인 배너 UI
- 로딩 스켈레톤
- 전역 에러 페이지

---

## Phase 2 — MVP 출시 (목표: 첫 유료 고객)

### 목적
Roomly를 "공짜로 써보게 해주는 도구"에서 "돈 받을 수 있는 서비스"로 전환.  
3~5개 호텔 베타 → 월 1~2만원 → 50개 호텔 목표.

### 핵심 원칙
- 관리자가 Roomly 없이는 못 살게 만들어라 (lock-in = 데이터 축적 + 알림 의존)
- 직원이 폰에서 30초 안에 현재 상태를 알 수 있어야 한다
- 결제가 마찰 없어야 한다 (Stripe, 카드 등록 → 자동 갱신)

### 기능 목록

#### 2-A. 푸시 알림 (배정 알림)
- 직원이 배정 받으면 폰에 바로 알림
- 관리자는 "체크인 2시간 전 미완료 방" 알림 수신
- Android 전체, iOS 16.4+ 지원
- **왜 지금**: 가장 자주 요청받는 기능. 없으면 경쟁사 대비 약점

#### 2-B. 결제 시스템 (Stripe)
- 3플랜: 스타터(50객실/월 3만), 스탠다드(150객실/월 7만), 프로(무제한/월 15만)
- 30일 무료 체험
- 만료 시 현황판 읽기 전용 잠금
- **왜 지금**: 수익 없이는 지속 불가

#### 2-C. 이메일 자동화 (Resend)
- 가입 환영 이메일 (온보딩 체크리스트 포함)
- 일일 리포트 이메일 (매일 오전 8시, 전날 통계 요약)
- 결제 영수증 이메일
- **왜 지금**: retention과 신뢰 구축

#### 2-D. 통계 고도화
- 주간/월간 뷰 탭 추가
- 직원별 성과 차트 (처리 시간 추이)
- CSV 내보내기
- **왜 지금**: 관리자가 보고서를 상사에게 보여줘야 함

#### 2-E. 랜딩 페이지 + SEO
- `/` 를 랜딩 페이지로 전환 (현재는 `/login` 리다이렉트)
- 기능 소개, 요금제, 시작하기 CTA
- 호텔 키워드 SEO 최적화
- **왜 지금**: 인바운드 없으면 영업만으로 한계

#### 2-F. 운영자 대시보드 (사이트 오너 전용)
- `/super-admin` — 전체 호텔 현황, 라이선스 발급, 수익 요약
- **왜 지금**: 지금은 Supabase 콘솔에서 직접 라이선스 INSERT 해야 함. 비효율

#### 2-G. 현황판 UX 개선
- 배정 시 드래그앤드롭 (현재는 카드 클릭 → 모달)
- 체크인 시간 일괄 등록 모달
- 객실 상태 일괄 변경 (층 전체 dirty → 등)

#### 2-H. 보안 강화
- API Rate Limiting (Upstash Redis)
- 로그인 시도 제한

---

## Phase 3 — 정식 SaaS (목표: 체인 호텔, 해외 진출)

### 목적
개인 모텔 → 체인 호텔 → 해외 호텔로 확장.  
월 3~15만원 SaaS, 100개 호텔 돌파 → 전업 전환.

### 기능 목록

#### 3-A. 다국어 (i18n)
- 한국어 (기본), 영어, 베트남어
- 직원 화면은 베트남어 우선 (외국인 하우스키퍼 많음)

#### 3-B. PMS 연동
- 체크아웃 이벤트 웹훅 수신 → 자동 dirty 전환
- Mews, Cloudbeds 어댑터 우선
- Oracle Opera는 3-B-3으로 별도 처리 (복잡)

#### 3-C. 비품 관리 (Supplies)
- 직원이 청소 완료 시 비품 사용량 기록
- 관리자는 재고 현황 + 발주 필요 알림
- **데이터**: supplies, supply_requests, supply_inventory 테이블 신규

#### 3-D. 유지보수 신고 (Maintenance)
- 직원이 청소 중 파손/고장 사진 + 메모로 신고
- 관리자 화면에 유지보수 대기 목록
- **데이터**: maintenance_requests 테이블 신규

#### 3-E. AI 스마트 배정
- 직원 과거 처리 속도 + 현재 배정량 기반 최적 배정 추천
- Claude API 또는 간단한 휴리스틱 알고리즘

#### 3-F. 체인 호텔 (Enterprise)
- 법인 계정: 1 법인 → N 호텔 관리
- 체인 전체 현황판 (프로퍼티별 완료율 비교)
- **데이터**: organizations 테이블 신규, hotels에 org_id 추가

#### 3-G. 공개 API
- API 키 발급 (관리자 설정에서)
- REST API: 객실 상태 조회/변경, 배정 조회
- Swagger 문서 자동 생성
- **용도**: PMS 업체가 직접 연동할 때 사용

#### 3-H. 네이티브 앱
- Capacitor로 PWA → iOS/Android 앱 래핑
- 앱스토어/플레이스토어 배포
- 푸시 알림 네이티브 처리 (APNs, FCM)

---

## 기술 결정사항

### Phase 2에서 추가되는 의존성
| 패키지 | 용도 |
|---|---|
| `stripe` | 결제 처리 |
| `@stripe/stripe-js` | 클라이언트 Stripe Elements |
| `resend` | 이메일 발송 |
| `react-email` | 이메일 템플릿 |
| `web-push` | 푸시 알림 (이미 설치됨) |
| `@upstash/redis` + `@upstash/ratelimit` | API Rate Limiting |
| `recharts` | 통계 차트 |
| `papaparse` | CSV 내보내기 |

### Phase 3에서 추가되는 의존성
| 패키지 | 용도 |
|---|---|
| `next-intl` | 다국어 |
| `@capacitor/core` | 네이티브 앱 |
| `swagger-jsdoc` + `swagger-ui-react` | API 문서 |

### DB 추가 테이블 (Phase 3)
```sql
-- organizations: 체인 호텔 법인 계정
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  plan       TEXT NOT NULL DEFAULT 'enterprise',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- hotels에 org_id 추가
ALTER TABLE hotels ADD COLUMN org_id UUID REFERENCES organizations(id);

-- supplies: 비품 마스터
CREATE TABLE supplies (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  unit     TEXT NOT NULL DEFAULT '개',
  stock    INTEGER NOT NULL DEFAULT 0
);

-- supply_requests: 비품 사용 기록
CREATE TABLE supply_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id    UUID REFERENCES rooms(id),
  staff_id   UUID REFERENCES staff(id),
  supply_id  UUID NOT NULL REFERENCES supplies(id),
  quantity   INTEGER NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- maintenance_requests: 유지보수 신고
CREATE TABLE maintenance_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id     UUID NOT NULL REFERENCES rooms(id),
  staff_id    UUID REFERENCES staff(id),
  description TEXT NOT NULL,
  photo_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- api_keys: 공개 API 키
CREATE TABLE api_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  key_hash   TEXT NOT NULL UNIQUE,
  label      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used  TIMESTAMPTZ
);
```

---

## 수익 목표

| 단계 | 조건 | 월 매출 |
|---|---|---|
| Phase 2 출시 | 10개 호텔 × 평균 5만원 | 50만원 |
| Phase 2 안정 | 50개 호텔 × 평균 5만원 | 250만원 (부업 → 사이드) |
| Phase 3 출시 | 100개 호텔 × 평균 7만원 | 700만원 (전업 전환) |
| Phase 3 안정 | 체인 10개 + 개별 100개 | 1,500만원+ |
