import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components'

interface Props {
  hotelName: string
  appUrl: string
  daysLeft: number
  totalCompleted: number
  avgMinutes: number | null
  topStaff: string | null
}

export default function TrialEndingEmail({ hotelName, appUrl, daysLeft, totalCompleted, avgMinutes, topStaff }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#dc2626', fontSize: '22px' }}>
            무료 체험이 {daysLeft}일 후 종료됩니다
          </Heading>
          <Text style={{ color: '#334155', fontSize: '15px' }}>
            {hotelName} 관리자님, 3개월 체험 기간이 곧 끝납니다.
            지금까지의 성과를 확인하고 계속 사용할 플랜을 선택해 주세요.
          </Text>
          <Section style={{ backgroundColor: '#fef2f2', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <Text style={{ margin: 0, color: '#991b1b', fontWeight: 'bold' }}>📊 3개월 체험 성과</Text>
            <Text style={{ margin: '8px 0 0', color: '#991b1b' }}>총 청소 완료: {totalCompleted}건</Text>
            {avgMinutes !== null && (
              <Text style={{ margin: '4px 0 0', color: '#991b1b' }}>평균 완료 시간: {avgMinutes}분</Text>
            )}
            {topStaff && (
              <Text style={{ margin: '4px 0 0', color: '#991b1b' }}>가장 활발한 직원: {topStaff}</Text>
            )}
          </Section>
          <Button
            href={`${appUrl}/admin/billing`}
            style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}
          >
            요금제 선택하기 →
          </Button>
          <Hr />
          <Section>
            <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>요금 안내</Text>
            <Text style={{ color: '#475569', margin: '4px 0' }}>스타터 — 월 30,000원 (50객실 이하)</Text>
            <Text style={{ color: '#475569', margin: '4px 0' }}>스탠다드 — 월 70,000원 (150객실 이하)</Text>
            <Text style={{ color: '#475569', margin: '4px 0' }}>프로 — 월 150,000원 (무제한)</Text>
          </Section>
          <Text style={{ color: '#94a3b8', fontSize: '12px', marginTop: '24px' }}>© 2025 Roomly</Text>
        </Container>
      </Body>
    </Html>
  )
}
