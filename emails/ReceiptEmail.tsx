import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Section,
} from '@react-email/components'

interface ReceiptEmailProps {
  hotelName: string
  plan: string
  amount: number
  nextBillingDate: string
}

export default function ReceiptEmail({
  hotelName,
  plan,
  amount,
  nextBillingDate,
}: ReceiptEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#0f172a', fontSize: '24px' }}>
            결제가 완료되었습니다
          </Heading>
          <Text style={{ color: '#334155', fontSize: '16px' }}>
            {hotelName} 호텔의 Roomly 구독 결제 영수증입니다.
          </Text>
          <Hr />
          <Section>
            <Text style={{ color: '#0f172a' }}>
              <strong>플랜:</strong> {plan}
            </Text>
            <Text style={{ color: '#0f172a' }}>
              <strong>결제 금액:</strong> ₩{amount.toLocaleString('ko-KR')}
            </Text>
            <Text style={{ color: '#0f172a' }}>
              <strong>다음 결제일:</strong> {nextBillingDate}
            </Text>
          </Section>
          <Text style={{ color: '#334155', fontSize: '14px' }}>
            결제 내역은 결제 관리 페이지에서 언제든 확인할 수 있습니다.
          </Text>
          <Button
            href={`${appUrl}/admin/billing`}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            결제 내역 보기 →
          </Button>
          <Hr />
          <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
            © 2026 Roomly. 문의: support@roomly.app
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
