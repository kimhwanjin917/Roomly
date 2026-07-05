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

interface PaymentFailedEmailProps {
  hotelName: string
  failureReason: string
  amount: number
  plan?: string
}

export default function PaymentFailedEmail({
  hotelName,
  failureReason,
  amount,
  plan,
}: PaymentFailedEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#dc2626', fontSize: '24px' }}>
            결제에 실패했습니다
          </Heading>
          <Text style={{ color: '#334155', fontSize: '16px' }}>
            {hotelName} 호텔의 구독 결제가 처리되지 않았습니다.
          </Text>
          <Hr />
          <Section>
            {plan && (
              <Text style={{ color: '#0f172a' }}>
                <strong>플랜:</strong> {plan}
              </Text>
            )}
            <Text style={{ color: '#0f172a' }}>
              <strong>결제 금액:</strong> ₩{amount.toLocaleString('ko-KR')}
            </Text>
            <Text style={{ color: '#0f172a' }}>
              <strong>실패 사유:</strong> {failureReason}
            </Text>
          </Section>
          <Text style={{ color: '#334155', fontSize: '14px' }}>
            카드 정보를 확인한 후 결제 관리 페이지에서 결제 수단을 다시 등록해주세요.
            결제가 완료될 때까지 일부 기능 이용이 제한될 수 있습니다.
          </Text>
          <Button
            href={`${appUrl}/admin/billing`}
            style={{
              backgroundColor: '#dc2626',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            결제 관리로 이동 →
          </Button>
          <Hr />
          <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
            © 2025 Roomly. 문의: support@roomly.app
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
