import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침 — Roomly',
  description:
    'Roomly 호텔 하우스키핑 관리 서비스의 개인정보처리방침입니다. 개인정보 수집 항목, 이용 목적, 보유 기간, 처리위탁 현황 등을 안내합니다.',
}

const sections = [
  { id: 'items', title: '1. 수집하는 개인정보 항목' },
  { id: 'purpose', title: '2. 개인정보의 수집 및 이용 목적' },
  { id: 'retention', title: '3. 개인정보의 보유 및 이용 기간' },
  { id: 'entrustment', title: '4. 개인정보 처리위탁 및 국외 이전' },
  { id: 'rights', title: '5. 정보주체의 권리와 행사 방법' },
  { id: 'officer', title: '6. 개인정보 보호책임자' },
  { id: 'destruction', title: '7. 개인정보의 파기 절차 및 방법' },
  { id: 'notice', title: '8. 개인정보처리방침의 변경 고지' },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Roomly</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
          >
            로그인
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
          개인정보처리방침
        </h1>
        <p className="text-sm text-slate-400 mb-6">시행일: 2026년 7월 6일</p>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-10">
          Roomly(이하 &ldquo;회사&rdquo;)는 개인정보보호법 제30조에 따라 정보주체의 개인정보를
          보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이
          개인정보처리방침을 수립·공개합니다.
        </p>

        {/* 목차 */}
        <nav
          aria-label="목차"
          className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-12"
        >
          <h2 className="text-sm font-bold text-slate-900 mb-4">목차</h2>
          <ol className="space-y-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-12">
          {/* 1 */}
          <section id="items" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              1. 수집하는 개인정보 항목
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">구분</th>
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">수집 항목</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 border-b border-slate-100 whitespace-nowrap">필수</td>
                      <td className="px-4 py-3 border-b border-slate-100">이메일, 호텔명</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-slate-100 whitespace-nowrap">선택</td>
                      <td className="px-4 py-3 border-b border-slate-100">전화번호, 직원정보(이름 등)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap">결제</td>
                      <td className="px-4 py-3">
                        토스페이먼츠 billing_key (카드번호는 저장하지 않습니다)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                결제 시 카드번호 등 결제수단 정보는 토스페이먼츠가 직접 처리하며, 회사는 정기결제를
                위한 billing_key만 보관합니다.
              </p>
            </div>
          </section>

          {/* 2 */}
          <section id="purpose" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              2. 개인정보의 수집 및 이용 목적
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <ol className="list-decimal pl-5 space-y-2">
                <li>서비스 제공: 회원 식별, 호텔 하우스키핑 관리 기능 제공, 고객 문의 응대</li>
                <li>결제: 구독 요금의 청구·결제·환불 처리</li>
                <li>서비스 개선: 서비스 이용 현황 분석 및 기능 개선</li>
              </ol>
            </div>
          </section>

          {/* 3 */}
          <section id="retention" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              3. 개인정보의 보유 및 이용 기간
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">항목</th>
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">보유 기간</th>
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 border-b border-slate-100">회원정보</td>
                      <td className="px-4 py-3 border-b border-slate-100">탈퇴 시 즉시 삭제</td>
                      <td className="px-4 py-3 border-b border-slate-100">이용계약 종료</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-slate-100">결제기록</td>
                      <td className="px-4 py-3 border-b border-slate-100">5년</td>
                      <td className="px-4 py-3 border-b border-slate-100">전자상거래법</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">서비스 이용 로그</td>
                      <td className="px-4 py-3">3개월</td>
                      <td className="px-4 py-3">통신비밀보호법</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 4 */}
          <section id="entrustment" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              4. 개인정보 처리위탁 및 국외 이전
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                회사는 서비스 제공을 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있으며, 일부
                수탁자는 국외에 소재합니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">수탁자</th>
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">위탁 업무</th>
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">소재지</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 border-b border-slate-100">Supabase</td>
                      <td className="px-4 py-3 border-b border-slate-100">데이터베이스 및 인증</td>
                      <td className="px-4 py-3 border-b border-slate-100">미국</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-slate-100">Resend</td>
                      <td className="px-4 py-3 border-b border-slate-100">이메일 발송</td>
                      <td className="px-4 py-3 border-b border-slate-100">미국</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-slate-100">토스페이먼츠</td>
                      <td className="px-4 py-3 border-b border-slate-100">결제 처리</td>
                      <td className="px-4 py-3 border-b border-slate-100">대한민국</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Anthropic</td>
                      <td className="px-4 py-3">AI 기능 제공 (AI 기능 사용 시)</td>
                      <td className="px-4 py-3">미국</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                회사는 위탁계약 체결 시 개인정보보호법에 따라 수탁자가 개인정보를 안전하게
                처리하는지를 감독합니다.
              </p>
            </div>
          </section>

          {/* 5 */}
          <section id="rights" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              5. 정보주체의 권리와 행사 방법
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                정보주체는 회사에 대하여 언제든지 개인정보의 열람, 정정, 삭제, 처리정지를 요구할
                수 있습니다.
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  서비스 내 설정 메뉴에서 직접 회원정보를 열람·수정하거나 탈퇴할 수 있습니다.
                </li>
                <li>
                  이메일(
                  <a
                    href="mailto:admin@roomly.app"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    admin@roomly.app
                  </a>
                  )로 열람·삭제를 요청할 수 있으며, 회사는 지체 없이 필요한 조치를 취합니다.
                </li>
              </ol>
            </div>
          </section>

          {/* 6 */}
          <section id="officer" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. 개인정보 보호책임자</h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                회사는 개인정보 처리에 관한 업무를 총괄하고 관련 문의·불만·피해구제를 처리하기
                위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="text-slate-800">
                  <span className="font-semibold">개인정보 보호책임자</span> — 이메일:{' '}
                  <a
                    href="mailto:admin@roomly.app"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    admin@roomly.app
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* 7 */}
          <section id="destruction" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              7. 개인정보의 파기 절차 및 방법
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.
                </li>
                <li>
                  전자적 파일 형태의 개인정보는 데이터베이스에서 삭제 후 백업본을 포함하여 30일
                  이내에 복구할 수 없는 방법으로 완전히 삭제합니다.
                </li>
              </ol>
            </div>
          </section>

          {/* 8 */}
          <section id="notice" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              8. 개인정보처리방침의 변경 고지
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                본 개인정보처리방침의 내용이 추가, 삭제 또는 수정되는 경우 시행일 전에 홈페이지
                공지사항 또는 이메일을 통하여 고지합니다.
              </p>
              <p>본 개인정보처리방침은 2026년 7월 6일부터 적용됩니다.</p>
            </div>
          </section>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-slate-900 text-slate-400 text-center py-8 px-4 text-sm">
        <div className="flex items-center justify-center gap-4 mb-3">
          <Link href="/terms" className="hover:text-white transition-colors">
            이용약관
          </Link>
          <span className="text-slate-700">|</span>
          <Link href="/privacy" className="hover:text-white transition-colors">
            개인정보처리방침
          </Link>
        </div>
        © 2025 Roomly. All rights reserved.
      </footer>
    </div>
  )
}
