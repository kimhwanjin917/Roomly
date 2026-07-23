import { C } from '@/lib/theme'

/**
 * Roomly 로고 마크 — 3×2 격자 위 체크 표시(✓ · ✓ / · ✓ ·).
 * 랜딩/로그인/회원가입 페이지에 각각 복제돼 있던 것을 단일화.
 */
export default function RoomlyMark({ size = 24 }: { size?: number }) {
  const s = size / 32

  const cols = [4, 12.5, 21].map(v => v * s)
  const rows = [4, 17].map(v => v * s)
  const cw = 7 * s, ch = 11 * s, rx_ = 2 * s

  // [col, row] — 체크 표시가 들어갈 칸
  const done = [[0, 0], [2, 0], [1, 1]]
  const isDone = (c: number, r: number) => done.some(([dc, dr]) => dc === c && dr === r)

  const check = (cx: number, cy: number) =>
    `M${cx - 1.7 * s} ${cy + 0.3 * s} L${cx - 0.3 * s} ${cy + 1.8 * s} L${cx + 2.5 * s} ${cy - 2.2 * s}`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <rect width={size} height={size} rx={8 * s} fill="#17171B" />

      {done.map(([c, r]) => (
        <ellipse
          key={`g${c}${r}`}
          cx={cols[c] + cw / 2} cy={rows[r] + ch / 2}
          rx={5.5 * s} ry={6.5 * s}
          fill={C.accent} opacity="0.22"
        />
      ))}

      {rows.map((y, r) =>
        cols.map((x, c) => (
          <rect
            key={`c${c}${r}`}
            x={x} y={y} width={cw} height={ch} rx={rx_}
            fill={isDone(c, r) ? C.accent : '#2C2F36'}
          />
        )),
      )}

      {/* 20px 미만에서는 체크 획이 뭉개져 생략 */}
      {size >= 20 && done.map(([c, r]) => (
        <path
          key={`k${c}${r}`}
          d={check(cols[c] + cw / 2, rows[r] + ch / 2)}
          stroke="white"
          strokeWidth={1.5 * s}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </svg>
  )
}
