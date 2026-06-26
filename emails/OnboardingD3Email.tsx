import { Html, Head, Body, Container, Heading, Text, Button, Hr } from '@react-email/components'

interface Props {
  hotelName: string
  appUrl: string
}

export default function OnboardingD3Email({ hotelName, appUrl }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#2563eb', fontSize: '22px' }}>
            직원들이 아직 QR을 받지 못했어요
          </Heading>
          <Text style={{ color: '#334155', fontSize: '15px' }}>
            {hotelName} 관리자님, 직원을 등록하셨는데 아직 첫 배정이 없어요.
            QR 코드를 출력해서 직원 폰으로 스캔하게 해보셨나요?
          </Text>
          <Button
            href={`${appUrl}/admin/staff`}
            style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}
          >
            QR 코드 출력하기 →
          </Button>
          <Hr />
          <Text style={{ color: '#64748b', fontSize: '13px' }}>
            iPhone 사용 직원이 있다면 Safari에서 접속 후 "홈 화면에 추가"를 눌러야 합니다.
            Chrome에서는 PWA 설치가 되지 않습니다.
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: '12px' }}>© 2025 Roomly</Text>
        </Container>
      </Body>
    </Html>
  )
}
