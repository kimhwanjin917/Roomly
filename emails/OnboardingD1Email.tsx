import { Html, Head, Body, Container, Heading, Text, Button, Hr } from '@react-email/components'

interface Props {
  hotelName: string
  appUrl: string
}

export default function OnboardingD1Email({ hotelName, appUrl }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#2563eb', fontSize: '22px' }}>
            아직 객실을 등록하지 않으셨네요
          </Heading>
          <Text style={{ color: '#334155', fontSize: '15px' }}>
            {hotelName} 관리자님, 어제 가입하셨는데 아직 객실 등록이 안 됐어요.
            객실 한 개만 등록하면 현황판을 바로 쓸 수 있습니다.
          </Text>
          <Button
            href={`${appUrl}/admin/rooms`}
            style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}
          >
            객실 등록하기 →
          </Button>
          <Hr />
          <Text style={{ color: '#64748b', fontSize: '13px' }}>
            101~110호처럼 범위로 한 번에 등록할 수도 있어요. 온보딩 마법사의 일괄 등록을 이용해 보세요.
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: '12px' }}>© 2025 Roomly</Text>
        </Container>
      </Body>
    </Html>
  )
}
