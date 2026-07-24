import { C, cardSt } from '@/lib/theme'

export default function Loading() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 14 }} className="md:pb-6">
      <div style={{ width: 40, height: 20, background: C.card, borderRadius: 6 }} className="animate-pulse" />

      {/* 호텔 정보 스켈레톤 */}
      <section style={cardSt}>
        <div style={{ width: 60, height: 16, background: C.surface, borderRadius: 5, marginBottom: 16 }} className="animate-pulse" />
        <div style={{ height: 44, background: C.surface, borderRadius: 10, marginBottom: 12 }} className="animate-pulse" />
        <div style={{ height: 44, background: C.surface, borderRadius: 10 }} className="animate-pulse" />
      </section>

      {/* API 키 스켈레톤 */}
      <section style={cardSt}>
        <div style={{ width: 80, height: 16, background: C.surface, borderRadius: 5, marginBottom: 16 }} className="animate-pulse" />
        <div style={{ height: 44, background: C.surface, borderRadius: 10 }} className="animate-pulse" />
      </section>
    </main>
  )
}
