import { C } from '@/lib/theme'

export default function Loading() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 14 }} className="md:pb-6">
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 80, height: 20, background: C.card, borderRadius: 6 }} className="animate-pulse" />
        <div style={{ width: 80, height: 36, background: C.card, borderRadius: 10 }} className="animate-pulse" />
      </div>

      {/* 탭 스켈레톤 */}
      <div style={{ width: 200, height: 38, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }} className="animate-pulse" />

      {/* 요청 카드 스켈레톤 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ width: 140, height: 14, background: C.surface, borderRadius: 5 }} className="animate-pulse" />
                <div style={{ width: 180, height: 12, background: C.surface, borderRadius: 5 }} className="animate-pulse" />
              </div>
              <div style={{ width: 40, height: 28, background: C.surface, borderRadius: 8 }} className="animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
