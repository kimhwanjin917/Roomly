import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components'

interface StaffStat {
  name: string
  completed: number
  avgMinutes: number | null
}

interface Props {
  hotelName: string
  appUrl: string
  completed: number
  avgMinutes: number | null
  topStaff: string | null
  staffStats: StaffStat[]
}

export default function OnboardingD7Email({ hotelName, appUrl, completed, avgMinutes, topStaff, staffStats }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#2563eb', fontSize: '22px' }}>
            {hotelName}의 첫 7일 현황
          </Heading>
          <Text style={{ color: '#334155', fontSize: '15px' }}>
            Roomly를 사용한 첫 주가 지났습니다. 이번 주 성과를 확인해 보세요.
          </Text>
          <Section style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <Text style={{ margin: 0, color: '#1e40af', fontWeight: 'bold' }}>📊 이번 주 요약</Text>
            <Text style={{ margin: '8px 0 0', color: '#1e40af' }}>청소 완료: {completed}건</Text>
            {avgMinutes !== null && (
              <Text style={{ margin: '4px 0 0', color: '#1e40af' }}>평균 완료 시간: {avgMinutes}분</Text>
            )}
            {topStaff && (
              <Text style={{ margin: '4px 0 0', color: '#1e40af' }}>가장 빠른 직원: {topStaff}</Text>
            )}
          </Section>
          {staffStats.length > 0 && (
            <Section>
              <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>직원별 현황</Text>
              {staffStats.map((s) => (
                <Text key={s.name} style={{ margin: '4px 0', color: '#475569' }}>
                  {s.name}: {s.completed}건{s.avgMinutes !== null ? ` (평균 ${s.avgMinutes}분)` : ''}
                </Text>
              ))}
            </Section>
          )}
          <Hr />
          <Text style={{ color: '#64748b', fontSize: '13px' }}>
            이 숫자가 매주 쌓입니다. 다음 주 리포트도 보내드릴게요.
          </Text>
          <Button
            href={`${appUrl}/admin/stats`}
            style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}
          >
            통계 보기 →
          </Button>
          <Text style={{ color: '#94a3b8', fontSize: '12px', marginTop: '24px' }}>© 2025 Roomly</Text>
        </Container>
      </Body>
    </Html>
  )
}
