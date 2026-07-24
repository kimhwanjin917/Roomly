import { C } from '@/lib/theme'

export default function Loading() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 14 }} className="md:pb-6">
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ width: 80, height: 20, background: C.card, borderRadius: 6 }} className="animate-pulse" />
          <div style={{ width: 56, height: 14, background: C.card, borderRadius: 6 }} className="animate-pulse" />
        </div>
        <div style={{ width: 80, height: 36, background: C.card, borderRadius: 10 }} className="animate-pulse" />
      </div>

      {/* 직원 목록 스켈레톤 */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ width: 36, height: 36, background: C.surface, borderRadius: 10, flexShrink: 0 }} className="animate-pulse" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ width: 80, height: 14, background: C.surface, borderRadius: 5 }} className="animate-pulse" />
              <div style={{ width: 60, height: 12, background: C.surface, borderRadius: 5 }} className="animate-pulse" />
            </div>
            <div style={{ width: 48, height: 14, background: C.surface, borderRadius: 5 }} className="animate-pulse" />
          </div>
        ))}
      </div>

      {/* 일일 근무자 코드 스켈레톤 */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ width: 120, height: 16, background: C.surface, borderRadius: 5, marginBottom: 8 }} className="animate-pulse" />
        <div style={{ width: 200, height: 12, background: C.surface, borderRadius: 5 }} className="animate-pulse" />
      </div>
    </main>
  )
}
