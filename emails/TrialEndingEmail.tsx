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

interface TrialEndingEmailProps {
  hotelName: string
  daysLeft: number
  /** 만료일 (YYYY-MM-DD) */
  endsAt: string
}

export function TrialEndingEmail({ hotelName, daysLeft, endsAt }: TrialEndingEmailProps) {
  const [year, month, day] = endsAt.split('-')
  const endsAtKo = `${year}년 ${month}월 ${day}일`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roomly.app'

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#2563eb', fontSize: '22px', marginBottom: '4px' }}>
            무료체험이 {daysLeft}일 후 종료됩니다
          </Heading>
          <Text style={{ color: '#64748b', fontSize: '14px', marginTop: '0' }}>{hotelName}</Text>

          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

          <Section
            style={{
              backgroundColor: '#fff7ed',
              borderRadius: '8px',
              padding: '4px 16px',
              marginBottom: '24px',
            }}
          >
            <Text style={{ fontSize: '14px', color: '#9a3412', lineHeight: '1.6' }}>
              3개월 무료체험이 <strong>{endsAtKo}</strong>에 종료됩니다. 체험 종료 후에도 실시간
              현황판, 직원 QR 접속, 일일 리포트를 계속 사용하시려면 유료 플랜으로 업그레이드해
              주세요.
            </Text>
          </Section>

          <Text style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
            지금 업그레이드하면 서비스 중단 없이 그대로 이어서 사용할 수 있습니다.
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
            플랜 업그레이드하기 →
          </Button>

          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

          <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
            © 2025 Roomly. 문의: support@roomly.app
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
