import { C } from '@/lib/theme'

export default function Loading() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px' }} className="md:pb-6">
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ width: 80, height: 20, background: C.card, borderRadius: 6 }} className="animate-pulse" />
          <div style={{ width: 56, height: 14, background: C.card, borderRadius: 6 }} className="animate-pulse" />
        </div>
        <div style={{ width: 90, height: 36, background: C.card, borderRadius: 10 }} className="animate-pulse" />
      </div>

      {/* 층별 카드 스켈레톤 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[3, 4, 3].map((count, fi) => (
          <div key={fi} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 28, height: 12, background: C.surface, borderRadius: 4 }} className="animate-pulse" />
            </div>
            <div>
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    borderBottom: i < count - 1 ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  <div style={{ width: 44, height: 16, background: C.surface, borderRadius: 5 }} className="animate-pulse" />
                  <div style={{ width: 28, height: 14, background: C.surface, borderRadius: 5 }} className="animate-pulse" />
                  <div style={{ width: 52, height: 22, background: C.surface, borderRadius: 999 }} className="animate-pulse" />
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                    <div style={{ width: 24, height: 14, background: C.surface, borderRadius: 4 }} className="animate-pulse" />
                    <div style={{ width: 24, height: 14, background: C.surface, borderRadius: 4 }} className="animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
