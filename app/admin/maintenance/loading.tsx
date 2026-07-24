import { C } from '@/lib/theme'

export default function Loading() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 14 }} className="md:pb-6">
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 100, height: 20, background: C.card, borderRadius: 6 }} className="animate-pulse" />
        <div style={{ width: 48, height: 14, background: C.card, borderRadius: 6 }} className="animate-pulse" />
      </div>

      {/* 필터 스켈레톤 */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[40, 52, 56, 52].map((w, i) => (
          <div key={i} style={{ width: w, height: 34, background: C.card, borderRadius: 999 }} className="animate-pulse" />
        ))}
      </div>

      {/* 항목 카드 스켈레톤 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 40, height: 20, background: C.surface, borderRadius: 999 }} className="animate-pulse" />
              <div style={{ width: 56, height: 20, background: C.surface, borderRadius: 999 }} className="animate-pulse" />
            </div>
            <div style={{ width: '80%', height: 14, background: C.surface, borderRadius: 5, marginBottom: 8 }} className="animate-pulse" />
            <div style={{ width: 120, height: 12, background: C.surface, borderRadius: 5 }} className="animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  )
}
