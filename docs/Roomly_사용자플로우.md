# Roomly 사용자 플로우

---

## 플로우 0 — 호텔 가입 (MVP: 초대 기반)

```
[운영자 작업 — Supabase 대시보드에서 수동 진행]

1. hotels 테이블에 새 호텔 row 생성 (name, subscription_plan)
2. Supabase Auth > Invite user 로 관리자 이메일 초대 발송
   (초대 시점에 auth.users row가 즉시 생성됨)
3. service_role API로 생성된 사용자의 app_metadata 설정
   → { hotel_id: "...", role: "admin" }
   (초대 직후 바로 설정 가능. 가입 전에 완료해야 로그인 시 JWT에 클레임이 포함됨)
4. 관리자가 이메일 링크 클릭 → 비밀번호 설정 페이지
5. 비밀번호 설정 완료 → /admin 진입
6. /admin/rooms 에서 객실 등록 시작 (초기 온보딩)
```

> 정식 서비스 이후: `/signup` 셀프 가입 페이지 추가 → 자동화

---

## 플로우 1 — 관리자 로그인

```
1. /login 접속
2. 이메일 + 비밀번호 입력
3. Supabase Auth 인증
   ├── 성공 → /admin 이동
   └── 실패 → "이메일 또는 비밀번호가 올바르지 않습니다" 표시
```

---

## 플로우 2 — 직원 등록 + QR 발급

```
1. 관리자가 /admin/staff 접속
2. [직원 추가] 버튼 클릭
3. 이름 + 연락처 입력 후 저장
4. 서버에서 UUID 생성 → staff.auth_id로 저장
   (직원은 Supabase Auth 계정 없음. auth_id는 QR JWT의 sub 클레임 역할)
5. staff 테이블에 row 생성 (auth_id, qr_version=1 포함)
6. 서버에서 커스텀 JWT 발급 (sub=auth_id, app_metadata에 hotel_id·role·staff_id·qr_version 포함)
   → /worker/[staffId]?token=xxx
   (magic link는 1회성이라 QR 재사용 불가 → 커스텀 JWT로 대체. qr_version 포함으로 재발급 시 구 QR 무효화)
7. QR 코드 자동 생성 (해당 URL 인코딩)
8. 관리자가 QR 이미지 다운로드 → 직원에게 전달 (인쇄 또는 카톡 전송)
```

---

## 플로우 3 — 직원 QR 접속

```
1. 직원이 QR 스캔
2. /worker/[staffId]?token=xxx 접속
3. 서버에서 JWT 토큰 검증 (서명 + qr_version 일치 여부 확인)
   ├── 유효 → 세션 쿠키 저장 후 직원 화면 진입 (배정 목록 표시)
   ├── 무효/변조 → "접속 링크가 올바르지 않습니다. 관리자에게 문의하세요" 표시
   └── qr_version 불일치 → "QR이 만료되었습니다. 새 QR을 사용하세요" 표시 (에러 AUTH-10)
4. 이후 접속은 세션 쿠키로 인증 (QR 재스캔 불필요)
```

---

## 플로우 4 — 체크아웃 → 객실 더티 전환

```
1. 관리자가 /admin 현황판에서 객실 카드 클릭
2. 배정 모달에서 상태를 [더티]로 변경
3. rooms.status → dirty 업데이트
4. room_logs에 변경 이력 기록
5. 현황판 실시간 반영 (해당 카드 색상 변경)
```

> 향후 PMS 연동 시 체크아웃 이벤트 수신 → 자동 dirty 전환으로 대체

---

## 플로우 5 — 객실 배정

```
1. 관리자가 현황판에서 더티 상태 객실 카드 클릭
2. 배정 모달에서 직원 선택
3. [배정 확정] 클릭
4. assignments 테이블에 row 생성 (assigned_at 기록)
5. 브라우저 푸시 알림 발송 → 해당 직원 브라우저로
   메시지: "[302호] 배정되었습니다. 체크인: 14:00"
   (직원이 브라우저를 열어두지 않은 경우 다음 접속 시 배정 목록에서 확인)
6. 직원 화면(/worker/[staffId]) 배정 목록에 실시간 반영
```

> 카카오톡 등 외부 알림은 추후 단계에서 추가

---

## 플로우 6 — 직원 청소 처리 (핵심 플로우)

```
1. 직원이 /worker/[staffId] 접속
2. 배정된 방 목록 확인 (우선순위 순)
3. 방 카드에서 [청소 시작] 탭
   → rooms.status → cleaning
   → room_logs 기록
   → 관리자 현황판 실시간 반영

4. 청소 완료 후 [완료] 탭
   → rooms.status → done
   → assignments.completed_at 기록
   → room_logs 기록
   → 관리자 현황판 실시간 반영

5. (실수로 청소 시작 눌렀을 때) [대기중으로 되돌리기] 탭 (cleaning 상태에서만 노출)
   → rooms.status → dirty
   → room_logs 기록 (되돌리기 이력 보존)
   → 관리자 현황판 실시간 반영

6. (선택) 메모 입력 후 저장
   → room_logs.memo에 기록
```

---

## 플로우 7 — 체크인 임박 긴급 알림

```
[자동 - 관리자 화면 마운트 후 60초 인터벌 폴링]

1. 현재 시각 기준 2시간 이내 체크인 방 조회
   (rooms.checkin_time <= now() + 2h AND status != 'done')
2. 해당 방 현황판에 긴급 표시 (빨간 테두리 + 경고 아이콘)
3. 관리자 브라우저에 푸시 알림 발송
   메시지: "[긴급] 302호 체크인 2시간 전. 아직 미완료 상태입니다."
4. 이미 알림 발송된 방은 중복 발송 안 함
   (room_logs에서 room_id + alert_type = 'urgent_2h' 존재 여부 확인 후 스킵)
   (체크인 초과 알림은 alert_type = 'overdue' 로 별도 관리 — 두 타입 독립적으로 1회씩 발송)
```

> 카카오톡 등 외부 알림은 추후 단계에서 추가

---

## 플로우 8 — 점검 대기 처리

```
1. 직원이 청소 완료 후 이상 발견
2. [점검 필요] 탭
   → rooms.status → inspect
   → room_logs에 메모 기록
3. 관리자 현황판에 보라색으로 표시
4. 관리자가 직접 점검 후 상태 수동 변경 (done 또는 dirty)
```

---

## 플로우 9 — 게스트(일일알바) 접속

```
1. 관리자가 /admin/staff 에서 [오늘의 게스트 코드 발급] 클릭
   → 6자리 랜덤 코드 생성 + DB 저장 (hotel_id, code, date, expires_at = 당일 자정)
   → 게스트 접속 URL 화면에 표시: NEXT_PUBLIC_APP_URL/guest?h={hotelId}
2. 관리자가 6자리 코드 + 접속 URL을 일일알바에게 카톡 등으로 전달
   (URL에 hotelId가 포함되어 있어야 서버가 어느 호텔 코드인지 특정 가능)
3. 일일알바가 /guest?h={hotelId} 접속
   → h 파라미터 없으면 "잘못된 접속 링크입니다" 표시 후 진행 불가
   → 코드 입력 폼 표시
4. 서버에서 코드 검증 (POST /api/auth/guest, body: { hotelId, code })
   ├── 유효 → 게스트 JWT 발급 (app_metadata: { hotel_id, role: "guest" }, expires: 당일 자정)
   │         → /worker/guest 이동
   └── 무효/만료 → "코드가 올바르지 않거나 만료되었습니다" 표시
5. 게스트가 /worker/guest에서 게스트 풀 배정 방 확인 + 상태 변경
6. 당일 자정 → 세션 자동 만료, 다음 접근 시 /guest?h={hotelId}로 리다이렉트
```

---

## 플로우 10 — 관리자가 게스트 풀에 방 배정

```
1. 관리자가 /admin 현황판에서 더티 객실 카드 클릭
2. 배정 모달 직원 선택 드롭다운에서 "게스트" 선택
3. [배정 확정] 클릭
4. assignments 테이블에 staff_id = null, is_guest = true 로 row 생성
5. /worker/guest 화면에 실시간 반영
```

---

## 플로우 11 — 오프라인 상태 접속

```
1. 직원이 인터넷 끊긴 상태로 /worker/[staffId] 접속
2. PWA 캐시에서 마지막 배정 목록 표시
3. 상단에 "오프라인 상태입니다. 변경사항이 반영되지 않을 수 있습니다." 배너 표시
4. 상태 변경 버튼 비활성화 (오작동 방지)
5. 인터넷 복구 시 배너 자동 제거 + 최신 데이터 로드
```
