import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Row,
  Column,
  Hr,
} from '@react-email/components'

interface StaffStat {
  name: string
  completed: number
  avgMinutes: number | null
}

interface DailyReportEmailProps {
  hotelName: string
  date: string
  totalRooms: number
  completed: number
  completionRate: number
  staffStats: StaffStat[]
}

export function DailyReportEmail({
  hotelName,
  date,
  totalRooms,
  completed,
  completionRate,
  staffStats,
}: DailyReportEmailProps) {
  // Format date as Korean: YYYY년 MM월 DD일
  const [year, month, day] = date.split('-')
  const dateKo = `${year}년 ${month}월 ${day}일`

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          {/* Header */}
          <Heading style={{ color: '#2563eb', fontSize: '22px', marginBottom: '4px' }}>
            Roomly 일일 리포트
          </Heading>
          <Text style={{ color: '#64748b', fontSize: '14px', marginTop: '0' }}>
            {hotelName} · {dateKo}
          </Text>

          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

          {/* Summary stats */}
          <Section>
            <Text style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px', marginBottom: '12px' }}>
              전체 현황
            </Text>
            <Row>
              <Column style={{ width: '33%', textAlign: 'center' as const }}>
                <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb', margin: '0' }}>
                  {totalRooms}
                </Text>
                <Text style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>전체 객실</Text>
              </Column>
              <Column style={{ width: '33%', textAlign: 'center' as const }}>
                <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', margin: '0' }}>
                  {completed}
                </Text>
                <Text style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>청소 완료</Text>
              </Column>
              <Column style={{ width: '33%', textAlign: 'center' as const }}>
                <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#ea580c', margin: '0' }}>
                  {completionRate}%
                </Text>
                <Text style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>완료율</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

          {/* Staff stats table */}
          {staffStats.length > 0 && (
            <Section>
              <Text style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px', marginBottom: '12px' }}>
                직원별 실적
              </Text>

              {/* Table header */}
              <Row style={{ backgroundColor: '#f1f5f9', padding: '8px 0', borderRadius: '4px' }}>
                <Column style={{ width: '40%', paddingLeft: '12px' }}>
                  <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', margin: '0' }}>
                    이름
                  </Text>
                </Column>
                <Column style={{ width: '30%', textAlign: 'center' as const }}>
                  <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', margin: '0' }}>
                    완료 건수
                  </Text>
                </Column>
                <Column style={{ width: '30%', textAlign: 'right' as const, paddingRight: '12px' }}>
                  <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', margin: '0' }}>
                    평균 소요 시간
                  </Text>
                </Column>
              </Row>

              {/* Table rows */}
              {staffStats.map((s, i) => (
                <Row
                  key={i}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    padding: '10px 0',
                  }}
                >
                  <Column style={{ width: '40%', paddingLeft: '12px' }}>
                    <Text style={{ fontSize: '14px', color: '#0f172a', margin: '0' }}>{s.name}</Text>
                  </Column>
                  <Column style={{ width: '30%', textAlign: 'center' as const }}>
                    <Text style={{ fontSize: '14px', color: '#0f172a', margin: '0' }}>
                      {s.completed}건
                    </Text>
                  </Column>
                  <Column style={{ width: '30%', textAlign: 'right' as const, paddingRight: '12px' }}>
                    <Text style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>
                      {s.avgMinutes !== null ? `${s.avgMinutes}분` : '-'}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          {staffStats.length === 0 && (
            <Section>
              <Text style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center' as const }}>
                어제 완료된 청소 기록이 없습니다.
              </Text>
            </Section>
          )}

          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

          <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
            © 2025 Roomly. 문의: support@roomly.app
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
