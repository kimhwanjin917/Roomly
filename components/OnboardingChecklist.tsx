'use client'

type Props = {
  roomCount: number
  staffCount: number
  hasAssignment: boolean
}

export default function OnboardingChecklist({ roomCount, staffCount, hasAssignment }: Props) {
  const steps = [
    { label: '객실 등록', done: roomCount > 0 },
    { label: '직원 등록', done: staffCount > 0 },
    { label: '배정 완료', done: hasAssignment },
  ]

  const allDone = steps.every(s => s.done)
  if (allDone) return null

  return (
    <div style={{
      background: '#1A1C20',
      border: '1px solid #212427',
      borderRadius: 8,
      padding: '12px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#8A8F98', whiteSpace: 'nowrap' }}>시작 체크리스트</span>
      <div style={{ display: 'flex', gap: 12 }}>
        {steps.map(step => (
          <span key={step.label} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: step.done ? '#34d399' : '#4A4F58' }}>{step.done ? '✓' : '○'}</span>
            <span style={{ color: step.done ? '#F2F3F4' : '#8A8F98' }}>{step.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
