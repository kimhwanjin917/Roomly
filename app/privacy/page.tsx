import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침 — Roomly',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl" style={{ borderBottom: '1px solid #F2F4F6' }}>
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#3182F6] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-lg font-bold text-[#191919] tracking-tight">Roomly</span>
          </Link>
          <Link href="/login" className="text-sm font-semibold text-[#6B7684] hover:text-[#191919] transition-colors">
            로그인
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-[#191919] mb-2">개인정보처리방침</h1>
        <p className="text-sm text-[#6B7684] mb-12">최종 수정일: 2025년 7월 1일</p>

        <div className="space-y-10 text-[#191919]">
          <section>
            <h2 className="text-lg font-bold mb-3">1. 개인정보의 처리 목적</h2>
            <p className="text-sm leading-relaxed text-[#4E5968]">
              Roomly(이하 &quot;서비스&quot;)는 다음의 목적을 위해 개인정보를 처리합니다. 처리된 개인정보는 아래 목적 외의 용도로 사용되지 않으며, 목적이 변경될 경우 별도 동의를 받겠습니다.
            </p>
            <ul className="mt-3 text-sm leading-relaxed text-[#4E5968] space-y-1 list-disc list-inside">
              <li>회원 가입 및 관리 (본인 확인, 계정 관리)</li>
              <li>서비스 제공 (호텔 객실 현황 관리, 하우스키핑 직원 배정)</li>
              <li>결제 처리 및 구독 관리</li>
              <li>서비스 운영·개선을 위한 통계 분석</li>
              <li>공지사항 전달, 일일 리포트 등 이메일 발송</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">2. 처리하는 개인정보 항목</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-4">
              <div>
                <p className="font-semibold text-[#191919] mb-1">관리자 계정</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>필수: 이메일 주소, 비밀번호(암호화 저장), 호텔명</li>
                  <li>자동 수집: 로그인 일시, 서비스 이용 기록</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[#191919] mb-1">하우스키핑 직원</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>필수: 이름, 역할(housekeeping/dirty)</li>
                  <li>선택: 전화번호</li>
                  <li>자동 생성: QR 코드 인증 토큰</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[#191919] mb-1">업무 데이터</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>객실 청소 배정 및 완료 기록</li>
                  <li>객실 상태 변경 로그</li>
                  <li>게스트(일일 근무자) 입장 코드 (개인 식별 정보 없음)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[#191919] mb-1">결제 정보</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>구독 플랜, 결제 일시, 결제 금액 (카드 번호 등 민감 정보는 토스페이먼츠가 직접 처리하며 Roomly는 보관하지 않음)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">3. 개인정보의 처리 및 보유 기간</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-2">
              <p>① 서비스 이용 기간 동안 개인정보를 보유·이용합니다.</p>
              <p>② 계정 탈퇴 또는 구독 해지 후 90일 이내에 개인정보를 파기합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.</p>
              <ul className="space-y-1 list-disc list-inside ml-4">
                <li>전자상거래법: 계약·청약철회 기록 5년, 대금결제 기록 5년</li>
                <li>통신비밀보호법: 로그인 기록 3개월</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">4. 개인정보의 제3자 제공</h2>
            <p className="text-sm leading-relaxed text-[#4E5968] mb-3">
              서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 서비스 운영을 위해 아래 외부 서비스를 이용합니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-[#4E5968] border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB]">
                    <th className="text-left p-3 border border-[#E5E8EB] font-semibold text-[#191919]">업체명</th>
                    <th className="text-left p-3 border border-[#E5E8EB] font-semibold text-[#191919]">목적</th>
                    <th className="text-left p-3 border border-[#E5E8EB] font-semibold text-[#191919]">처리 항목</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-[#E5E8EB]">Supabase (미국)</td>
                    <td className="p-3 border border-[#E5E8EB]">데이터베이스·인증 인프라</td>
                    <td className="p-3 border border-[#E5E8EB]">전체 서비스 데이터</td>
                  </tr>
                  <tr className="bg-[#F9FAFB]">
                    <td className="p-3 border border-[#E5E8EB]">토스페이먼츠 (한국)</td>
                    <td className="p-3 border border-[#E5E8EB]">결제 처리</td>
                    <td className="p-3 border border-[#E5E8EB]">결제 금액, 거래 정보</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-[#E5E8EB]">Resend (미국)</td>
                    <td className="p-3 border border-[#E5E8EB]">이메일 발송</td>
                    <td className="p-3 border border-[#E5E8EB]">이메일 주소</td>
                  </tr>
                  <tr className="bg-[#F9FAFB]">
                    <td className="p-3 border border-[#E5E8EB]">Vercel (미국)</td>
                    <td className="p-3 border border-[#E5E8EB]">서비스 호스팅</td>
                    <td className="p-3 border border-[#E5E8EB]">접속 로그</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">5. 개인정보 처리의 위탁</h2>
            <p className="text-sm leading-relaxed text-[#4E5968]">
              서비스는 위 제4조의 외부 서비스에 개인정보 처리를 위탁하고 있으며, 위탁 계약 시 개인정보가 안전하게 관리될 수 있도록 필요한 사항을 규정하고 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">6. 정보주체의 권리·의무 및 행사 방법</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-2">
              <p>이용자는 개인정보 처리와 관련하여 다음 권리를 행사할 수 있습니다.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>개인정보 열람 요청</li>
                <li>오류 등이 있을 경우 정정 요청</li>
                <li>삭제 요청 (법령상 의무 보유 기간 경과 후)</li>
                <li>처리 정지 요청</li>
              </ul>
              <p>권리 행사는 <a href="mailto:support@roomly.app" className="text-[#3182F6] hover:underline">support@roomly.app</a>으로 이메일 요청하거나, 서비스 내 계정 탈퇴 기능을 이용할 수 있습니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">7. 개인정보의 파기</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-2">
              <p>① 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 파기합니다.</p>
              <p>② 전자적 파일은 복구 불가능한 방법으로 영구 삭제하며, 출력물은 분쇄 또는 소각합니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">8. 개인정보 보호책임자</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-1">
              <p>개인정보 처리에 관한 업무를 총괄하는 책임자는 아래와 같습니다.</p>
              <p className="mt-2">개인정보 보호책임자: Roomly 운영팀</p>
              <p>이메일: <a href="mailto:support@roomly.app" className="text-[#3182F6] hover:underline">support@roomly.app</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">9. 개인정보 처리방침 변경</h2>
            <p className="text-sm leading-relaxed text-[#4E5968]">
              이 개인정보처리방침은 시행일로부터 적용되며, 내용 추가·삭제·수정 시 변경 사항을 시행 최소 7일 전에 이메일 또는 서비스 공지를 통해 알립니다.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#F2F4F6] mt-16 py-8">
        <div className="max-w-3xl mx-auto px-5 flex gap-6 text-sm text-[#6B7684]">
          <Link href="/terms" className="hover:text-[#191919]">이용약관</Link>
          <Link href="/privacy" className="hover:text-[#191919]">개인정보처리방침</Link>
        </div>
      </footer>
    </div>
  )
}
