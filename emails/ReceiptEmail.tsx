import {
  Html, Head, Body, Container, Heading, Text, Hr, Section,
} from '@react-email/components'
import { formatKoreanDate } from '@/lib/date'

interface ReceiptEmailProps {
  hotelName: string
  planName: string
  amount: number
  /** ISO 문자열 — 표시 형식은 이 컴포넌트가 결정한다 */
  paidAt: string
  nextBillingAt: string
}

export default function ReceiptEmail({
  hotelName,
  planName,
  amount,
  paidAt,
  nextBillingAt,
}: ReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#059669', fontSize: '22px' }}>
            결제가 완료되었습니다 ✓
          </Heading>
          <Text style={{ color: '#334155', fontSize: '15px' }}>
            {hotelName} 관리자님, 결제가 정상적으로 처리되었습니다.
          </Text>
          <Section style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            padding: '16px 20px',
            margin: '20px 0',
            border: '1px solid #bbf7d0',
          }}>
            <Text style={{ margin: 0, color: '#065f46', fontWeight: 'bold' }}>결제 영수증</Text>
            <Hr style={{ margin: '12px 0', borderColor: '#bbf7d0' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#374151', padding: '4px 0', fontSize: '14px' }}>플랜</td>
                  <td style={{ color: '#374151', padding: '4px 0', fontSize: '14px', textAlign: 'right' }}>{planName}</td>
                </tr>
                <tr>
                  <td style={{ color: '#374151', padding: '4px 0', fontSize: '14px' }}>결제 금액</td>
                  <td style={{ color: '#374151', padding: '4px 0', fontSize: '14px', textAlign: 'right', fontWeight: 'bold' }}>₩{amount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{ color: '#374151', padding: '4px 0', fontSize: '14px' }}>결제 일시</td>
                  <td style={{ color: '#374151', padding: '4px 0', fontSize: '14px', textAlign: 'right' }}>{formatKoreanDate(paidAt)}</td>
                </tr>
                <tr>
                  <td style={{ color: '#374151', padding: '4px 0', fontSize: '14px' }}>다음 결제일</td>
                  <td style={{ color: '#374151', padding: '4px 0', fontSize: '14px', textAlign: 'right' }}>{formatKoreanDate(nextBillingAt)}</td>
                </tr>
              </tbody>
            </table>
          </Section>
          <Text style={{ color: '#6b7280', fontSize: '13px' }}>
            이 이메일은 영수증 발송 목적으로 자동 발송됩니다. 문의사항은 support@roomly.app으로 연락해 주세요.
          </Text>
          <Hr />
          <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
            © 2025 Roomly
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
