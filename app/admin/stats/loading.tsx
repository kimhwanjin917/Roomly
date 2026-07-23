import { C } from '@/lib/theme'

export default function Loading() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px' }} className="md:pb-6">
      {/* 날짜 선택 스켈레톤 */}
      <div style={{ width: 144, height: 36, background: C.card, borderRadius: 10, marginBottom: 20 }} className="animate-pulse" />

      {/* 숫자 요약 3개 큰 박스 */}
      <div className="grid grid-cols-3" style={{ gap: 12, marginBottom: 20 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 56, height: 36, background: C.surface, borderRadius: 10 }} className="animate-pulse" />
            <div style={{ width: 40, height: 12, background: C.surface, borderRadius: 6 }} className="animate-pulse" />
          </div>
        ))}
      </div>

      {/* 진행률 바 스켈레톤 */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ width: 80, height: 12, background: C.surface, borderRadius: 6 }} className="animate-pulse" />
          <div style={{ width: 48, height: 12, background: C.surface, borderRadius: 6 }} className="animate-pulse" />
        </div>
        <div style={{ height: 8, background: C.surface, borderRadius: 999 }} className="animate-pulse" />
      </div>

      {/* 직원별 통계 스켈레톤 */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 128, height: 16, background: C.surface, borderRadius: 6 }} className="animate-pulse" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ padding: '12px 16px', borderTop: i === 0 ? 'none' : `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ width: 80, height: 16, background: C.surface, borderRadius: 6 }} className="animate-pulse" />
              <div style={{ width: 64, height: 12, background: C.surface, borderRadius: 6 }} className="animate-pulse" />
            </div>
            <div style={{ height: 6, background: C.surface, borderRadius: 999 }} className="animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  )
}
