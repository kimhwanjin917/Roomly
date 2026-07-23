import {
  Html, Head, Body, Container, Heading, Text, Button, Hr, Section,
} from '@react-email/components'

interface PaymentFailedEmailProps {
  hotelName: string
  planName: string
  amount: number
  failedAt: string
  billingUrl: string
}

export default function PaymentFailedEmail({
  hotelName,
  planName,
  amount,
  failedAt,
  billingUrl,
}: PaymentFailedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#DC2626', fontSize: '22px' }}>
            결제가 실패했습니다
          </Heading>
          <Text style={{ color: '#334155', fontSize: '15px' }}>
            {hotelName} 관리자님, 정기 결제 처리 중 오류가 발생했습니다.
          </Text>
          <Section style={{
            backgroundColor: '#fff1f2',
            borderRadius: '8px',
            padding: '16px 20px',
            margin: '20px 0',
            border: '1px solid #fecaca',
          }}>
            <Text style={{ margin: 0, color: '#991b1b', fontWeight: 'bold' }}>결제 실패 정보</Text>
            <Text style={{ margin: '8px 0 0', color: '#374151' }}>
              플랜: {planName}<br />
              금액: ₩{amount.toLocaleString()}<br />
              실패 일시: {failedAt}
            </Text>
          </Section>
          <Text style={{ color: '#334155' }}>
            카드 정보를 확인하고 결제 수단을 업데이트해주세요. 결제가 3회 연속 실패하면 서비스 이용이 일시 중단될 수 있습니다.
          </Text>
          <Button
            href={billingUrl}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: 'bold',
            }}
          >
            결제 수단 업데이트하기 →
          </Button>
          <Hr />
          <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
            문의: support@roomly.app | © 2025 Roomly
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
