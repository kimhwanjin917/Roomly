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

interface WelcomeEmailProps {
  hotelName: string
}

export default function WelcomeEmail({ hotelName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#2563eb', fontSize: '24px' }}>
            Roomly에 오신 것을 환영합니다 👋
          </Heading>
          <Text style={{ color: '#334155', fontSize: '16px' }}>
            {hotelName} 호텔 관리자님, 가입을 환영합니다.
          </Text>
          <Hr />
          <Section>
            <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>시작하기 3단계</Text>
            <Text>✅ 1. 객실을 등록하세요 → 객실 관리</Text>
            <Text>✅ 2. 직원을 추가하고 QR을 발급하세요 → 직원 관리</Text>
            <Text>✅ 3. 현황판에서 실시간으로 관리하세요 → 현황판</Text>
          </Section>
          <Button
            href={process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Roomly 시작하기 →
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
