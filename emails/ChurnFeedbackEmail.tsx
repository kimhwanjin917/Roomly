import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
} from '@react-email/components'

interface ChurnFeedbackEmailProps {
  hotelName: string
}

export default function ChurnFeedbackEmail({ hotelName }: ChurnFeedbackEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#0f172a', fontSize: '20px', marginBottom: '4px' }}>
            솔직한 의견을 듣고 싶습니다
          </Heading>
          <Text style={{ color: '#64748b', fontSize: '14px', marginTop: '0' }}>
            {hotelName} 관리자님께
          </Text>

          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

          <Text style={{ color: '#334155', fontSize: '15px', lineHeight: '1.7' }}>
            Roomly를 사용해 보셨는데, 어디선가 불편함을 느끼셨을 것 같아 직접 연락드립니다.
          </Text>

          <Text style={{ color: '#334155', fontSize: '15px', lineHeight: '1.7' }}>
            딱 한 가지만 알려주시면 됩니다.
          </Text>

          <Text style={{
            color: '#0f172a',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: '#f1f5f9',
            padding: '16px 20px',
            borderRadius: '8px',
            borderLeft: '3px solid #2563eb',
          }}>
            "Roomly를 쓰다가 가장 불편하셨던 점이 무엇인가요?"
          </Text>

          <Text style={{ color: '#334155', fontSize: '15px', lineHeight: '1.7' }}>
            이 이메일에 바로 답장해 주셔도 됩니다. 5분이면 충분합니다.
            말씀해 주신 내용은 제가 직접 읽고, 이번 주 안에 고치겠습니다.
          </Text>

          <Button
            href={`mailto:support@roomly.app?subject=[피드백] ${hotelName}&body=가장 불편했던 점: `}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: 'bold',
              fontSize: '14px',
              marginTop: '8px',
            }}
          >
            피드백 보내기 →
          </Button>

          <Hr style={{ borderColor: '#e2e8f0', margin: '32px 0 24px' }} />

          <Text style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.6' }}>
            Roomly 창업자가 직접 보내는 메일입니다.<br />
            원하지 않으시면 이 메일을 무시하셔도 됩니다.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
