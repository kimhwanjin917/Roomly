import { C } from '@/lib/theme'

export default function Loading() {
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px 80px' }} className="md:pb-6">
      {/* 필터 바 스켈레톤 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[80, 60, 60, 60, 80].map((w, i) => (
          <div key={i} style={{ height: 32, width: w, background: C.card, borderRadius: 10 }} className="animate-pulse" />
        ))}
      </div>

      {/* 카드 그리드 스켈레톤 */}
      <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 12 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            style={{ height: 128, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}
            className="animate-pulse"
          />
        ))}
      </div>
    </main>
  )
}
