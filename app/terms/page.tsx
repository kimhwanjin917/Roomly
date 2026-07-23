import Link from 'next/link'
import type { Metadata } from 'next'
import RoomlyMark from '@/components/RoomlyMark'

export const metadata: Metadata = {
  title: '이용약관 — Roomly',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl" style={{ borderBottom: '1px solid #F2F4F6' }}>
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <RoomlyMark size={32} />
            <span className="text-lg font-bold text-[#191919] tracking-tight">Roomly</span>
          </Link>
          <Link href="/login" className="text-sm font-semibold text-[#6B7684] hover:text-[#191919] transition-colors">
            로그인
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-[#191919] mb-2">이용약관</h1>
        <p className="text-sm text-[#6B7684] mb-12">최종 수정일: 2025년 7월 1일</p>

        <div className="space-y-10 text-[#191919]">
          <section>
            <h2 className="text-lg font-bold mb-3">제1조 (목적)</h2>
            <p className="text-sm leading-relaxed text-[#4E5968]">
              이 약관은 Roomly(이하 &quot;서비스&quot;)를 운영하는 서비스 제공자(이하 &quot;회사&quot;)와 서비스를 이용하는 고객(이하 &quot;이용자&quot;) 간의 권리·의무 및 서비스 이용에 관한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제2조 (정의)</h2>
            <ul className="text-sm leading-relaxed text-[#4E5968] space-y-2 list-disc list-inside">
              <li>&quot;서비스&quot;란 Roomly가 제공하는 호텔 하우스키핑 실시간 관리 웹 애플리케이션을 의미합니다.</li>
              <li>&quot;이용자&quot;란 본 약관에 동의하고 서비스를 이용하는 개인 또는 법인을 의미합니다.</li>
              <li>&quot;계정&quot;이란 이용자가 서비스를 이용하기 위해 생성한 고유 식별 정보를 의미합니다.</li>
              <li>&quot;직원&quot;이란 이용자(관리자)가 서비스에 등록하는 하우스키핑 직원을 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제3조 (약관의 효력 및 변경)</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-2">
              <p>① 이 약관은 서비스 화면에 게시하거나 이메일로 통지함으로써 효력이 발생합니다.</p>
              <p>② 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있으며, 개정 시 최소 7일 전에 공지합니다.</p>
              <p>③ 이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제4조 (서비스 이용)</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-2">
              <p>① 서비스는 회원 가입 후 14일 무료 체험 기간을 제공합니다.</p>
              <p>② 무료 체험 종료 후 유료 구독을 신청하지 않으면 서비스 이용이 제한됩니다.</p>
              <p>③ 이용자는 타인의 개인정보를 도용하거나 허위 정보로 가입할 수 없습니다.</p>
              <p>④ 서비스는 호텔 하우스키핑 관리 목적으로만 이용되어야 하며, 불법적인 용도로 사용할 수 없습니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제5조 (요금 및 결제)</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-2">
              <p>① 유료 서비스 요금은 서비스 내 요금제 페이지에 명시된 금액을 따릅니다.</p>
              <p>② 결제는 토스페이먼츠를 통해 처리되며, 매월 또는 매년 자동 청구됩니다.</p>
              <p>③ 결제 실패 시 회사는 이용자에게 이메일로 통보하며, 3회 연속 실패 시 서비스 이용이 일시 중단될 수 있습니다.</p>
              <p>④ 환불은 이용 개시 후 7일 이내 요청 시 전액 환불하며, 이후에는 잔여 기간에 대한 일할 계산 환불이 가능합니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제6조 (구독 해지)</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-2">
              <p>① 이용자는 언제든지 서비스 내 설정 페이지에서 구독을 해지할 수 있습니다.</p>
              <p>② 구독 해지 시 현재 결제 기간 종료일까지 서비스를 이용할 수 있습니다.</p>
              <p>③ 구독 해지 후 데이터는 90일간 보관되며, 이후 영구 삭제됩니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제7조 (서비스 제공 및 중단)</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-2">
              <p>① 회사는 연중무휴 24시간 서비스 제공을 원칙으로 하나, 시스템 점검·업데이트 등으로 일시 중단될 수 있습니다.</p>
              <p>② 천재지변, 외부 서비스(Supabase, 토스페이먼츠 등) 장애 등 불가항력으로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.</p>
              <p>③ 서비스 종료 시 최소 30일 전에 이용자에게 이메일로 공지합니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제8조 (이용자의 의무)</h2>
            <ul className="text-sm leading-relaxed text-[#4E5968] space-y-2 list-disc list-inside">
              <li>타인의 계정을 도용하거나 서비스를 해킹·크롤링하는 행위 금지</li>
              <li>서비스 운영을 고의로 방해하는 행위 금지</li>
              <li>직원 개인정보를 서비스 목적 외로 사용하는 행위 금지</li>
              <li>관련 법령 및 회사 정책을 준수</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제9조 (면책조항)</h2>
            <div className="text-sm leading-relaxed text-[#4E5968] space-y-2">
              <p>① 회사는 이용자가 서비스를 통해 얻는 정보의 정확성·신뢰성에 대해 보증하지 않습니다.</p>
              <p>② 이용자 간 또는 이용자와 제3자 간 분쟁에 대해 회사는 개입하지 않으며 책임을 지지 않습니다.</p>
              <p>③ 이용자의 귀책사유로 발생한 서비스 이용 장애에 대해 회사는 책임을 지지 않습니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">제10조 (분쟁 해결)</h2>
            <p className="text-sm leading-relaxed text-[#4E5968]">
              이 약관과 관련한 분쟁은 대한민국 법을 준거법으로 하며, 분쟁 발생 시 관할 법원은 회사 소재지 관할 법원으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">문의</h2>
            <p className="text-sm leading-relaxed text-[#4E5968]">
              이용약관에 관한 문의사항은 아래로 연락해 주세요.<br />
              이메일: <a href="mailto:support@roomly.app" className="text-[#3182F6] hover:underline">support@roomly.app</a>
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
