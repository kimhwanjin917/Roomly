// NOTE: 본 약관은 초안이며 법률 검토 전입니다.
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 — Roomly',
  description:
    'Roomly 호텔 하우스키핑 관리 서비스의 이용약관입니다. 서비스 이용 조건, 요금 및 결제, 환불 기준, 금지 행위 등을 안내합니다.',
}

const sections = [
  { id: 'service', title: '제1조 서비스 개요와 이용 조건' },
  { id: 'payment', title: '제2조 이용요금 및 결제 방법' },
  { id: 'refund', title: '제3조 구독 취소 및 환불 기준' },
  { id: 'prohibited', title: '제4조 금지 행위' },
  { id: 'disclaimer', title: '제5조 면책조항' },
  { id: 'privacy', title: '제6조 개인정보 처리' },
  { id: 'dispute', title: '제7조 분쟁 해결 및 준거법' },
  { id: 'amendment', title: '제8조 약관의 변경' },
  { id: 'effective', title: '부칙 (시행일)' },
]

export default function TermsPage() {
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
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">이용약관</h1>
        <p className="text-sm text-slate-400 mb-10">시행일: 2026년 7월 6일</p>

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
          {/* 제1조 */}
          <section id="service" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              제1조 서비스 개요와 이용 조건
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                Roomly(이하 &ldquo;회사&rdquo;)는 호텔 하우스키핑 실시간 관리를 위한 SaaS 서비스(이하
                &ldquo;서비스&rdquo;)를 제공합니다. 서비스는 실시간 객실 현황판, QR 기반 직원 접속,
                배정 알림 등의 기능을 포함합니다.
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <span className="font-semibold text-slate-800">가입:</span> 서비스 이용을
                  원하는 자는 이메일과 호텔 정보를 제공하고 본 약관에 동의함으로써 이용계약을
                  체결할 수 있습니다. 회사는 호텔 및 숙박업 운영과 관련 없는 목적의 가입을
                  거절하거나 사후에 이용을 제한할 수 있습니다.
                </li>
                <li>
                  <span className="font-semibold text-slate-800">자격:</span> 서비스는 숙박업을
                  운영하거나 그에 준하는 업무를 수행하는 사업자 및 그 소속 직원을 대상으로
                  합니다. 타인의 정보를 도용하여 가입한 경우 이용계약이 해지될 수 있습니다.
                </li>
                <li>
                  <span className="font-semibold text-slate-800">탈퇴:</span> 회원은 언제든지
                  서비스 내 설정 또는 이메일 요청을 통해 탈퇴할 수 있으며, 탈퇴 시 회원정보는
                  개인정보처리방침에 따라 처리됩니다.
                </li>
              </ol>
            </div>
          </section>

          {/* 제2조 */}
          <section id="payment" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">제2조 이용요금 및 결제 방법</h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>서비스는 월 단위 구독 방식으로 제공되며, 요금제는 다음과 같습니다.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">요금제</th>
                      <th className="text-left font-semibold px-4 py-3 border-b border-slate-200">월 이용요금</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 border-b border-slate-100">스타터</td>
                      <td className="px-4 py-3 border-b border-slate-100">30,000원</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-slate-100">스탠다드</td>
                      <td className="px-4 py-3 border-b border-slate-100">70,000원</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">프로</td>
                      <td className="px-4 py-3">150,000원</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  결제는 토스페이먼츠를 통한 월 구독(정기결제) 방식으로 이루어지며, 회원이 등록한
                  결제수단으로 매 결제일에 자동 청구됩니다.
                </li>
                <li>
                  신규 가입 회원에게는 3개월(90일)의 무료 체험 기간이 제공되며, 무료 체험 기간 종료 후
                  유료 구독으로 전환됩니다.
                </li>
                <li>
                  요금제 변경 시 변경된 요금은 다음 결제일부터 적용됩니다. 요금이 변경되는 경우
                  회사는 적용일 이전에 회원에게 고지합니다.
                </li>
              </ol>
            </div>
          </section>

          {/* 제3조 */}
          <section id="refund" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              제3조 구독 취소 및 환불 기준
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <ol className="list-decimal pl-5 space-y-2">
                <li>회원은 언제든지 서비스 내에서 구독을 해지할 수 있습니다.</li>
                <li>
                  구독일(결제일)로부터 7일 이내에 환불을 요청하는 경우 해당 결제 금액을 전액
                  환불합니다.
                </li>
                <li>
                  구독일로부터 7일이 경과한 후 해지하는 경우 환불은 제공되지 않으며, 이미 결제한
                  이용 기간이 만료될 때까지 서비스를 계속 이용할 수 있습니다.
                </li>
                <li>환불은 결제에 사용된 수단으로 처리되며, 처리에 영업일 기준 수일이 소요될 수 있습니다.</li>
              </ol>
            </div>
          </section>

          {/* 제4조 */}
          <section id="prohibited" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">제4조 금지 행위</h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>회원은 다음 각 호의 행위를 하여서는 안 됩니다.</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>자신이 소속되지 않은 다른 호텔의 데이터에 무단으로 접근하거나 접근을 시도하는 행위</li>
                <li>서비스의 API를 남용하거나 비정상적인 방법으로 과도한 요청을 발생시키는 행위</li>
                <li>서비스의 소스코드, 데이터베이스 등을 무단으로 복제·역설계·크롤링하는 행위</li>
                <li>계정 또는 QR 접속 링크를 권한 없는 제3자에게 양도·공유하는 행위</li>
                <li>서비스의 정상적인 운영을 방해하거나 다른 회원의 이용을 저해하는 행위</li>
                <li>관계 법령 또는 공서양속에 위반되는 행위</li>
              </ol>
              <p>
                회사는 회원이 위 금지 행위를 한 경우 사전 통지 후 서비스 이용을 제한하거나
                이용계약을 해지할 수 있으며, 긴급한 경우 사전 통지 없이 조치한 후 사후에 통지할
                수 있습니다.
              </p>
            </div>
          </section>

          {/* 제5조 */}
          <section id="disclaimer" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">제5조 면책조항</h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 불가항력으로 인하여
                  서비스를 제공할 수 없는 경우 그에 대한 책임을 지지 않습니다.
                </li>
                <li>
                  연속 3일 이하의 서비스 장애에 대해서는 별도의 환불 또는 보상이 제공되지
                  않습니다. 연속 3일을 초과하는 장애가 발생한 경우 회사는 장애 기간에 상응하는
                  이용요금을 감면하거나 이용 기간을 연장할 수 있습니다.
                </li>
                <li>
                  회사는 회원의 귀책사유로 인한 서비스 이용 장애, 회원이 서비스에 입력한 데이터의
                  정확성에 대하여 책임을 지지 않습니다.
                </li>
              </ol>
            </div>
          </section>

          {/* 제6조 */}
          <section id="privacy" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">제6조 개인정보 처리</h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                회사는 회원의 개인정보를 관계 법령 및 회사의{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
                  개인정보처리방침
                </Link>
                에 따라 보호하고 처리합니다. 개인정보의 수집 항목, 이용 목적, 보유 기간 등
                자세한 내용은 개인정보처리방침을 참고하시기 바랍니다.
              </p>
            </div>
          </section>

          {/* 제7조 */}
          <section id="dispute" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">제7조 분쟁 해결 및 준거법</h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  회사와 회원 간에 분쟁이 발생한 경우 상호 협의를 통해 원만하게 해결하도록
                  노력합니다.
                </li>
                <li>본 약관 및 서비스 이용과 관련된 사항에는 대한민국 법령이 적용됩니다.</li>
                <li>
                  협의로 해결되지 않는 분쟁에 대한 소송은 민사소송법에 따른 관할법원에 제기합니다.
                </li>
              </ol>
            </div>
          </section>

          {/* 제8조 */}
          <section id="amendment" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">제8조 약관의 변경</h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                회사는 관계 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다. 약관을
                변경하는 경우 적용일자 및 변경 사유를 명시하여 적용일 7일 전부터 서비스 내 공지
                또는 이메일을 통해 고지합니다. 회원에게 불리한 변경의 경우 적용일 30일 전에
                고지합니다.
              </p>
            </div>
          </section>

          {/* 부칙 */}
          <section id="effective" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-4">부칙</h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>본 약관은 2026년 7월 6일부터 시행합니다.</p>
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
