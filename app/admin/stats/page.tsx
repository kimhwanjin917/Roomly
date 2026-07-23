'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

const C = {
  bg:      '#0B1215',
  surface: '#17171B',
  card:    '#1A1C20',
  border:  '#212427',
  text:    '#F2F3F4',
  textMid: '#8A8F98',
  textDim: '#4A4F58',
  accent:  '#5e6ad2',
  green:   '#34d399',
  amber:   '#fbbf24',
  red:     '#f87171',
  violet:  '#818cf8',
}

type Period = 'daily' | 'weekly' | 'monthly'

type StaffStat = {
  staffId: string
  name: string
  completed: number
  avgMinutes: number | null
}

type IncompleteRoom = {
  number: string
  floor: number
  status: string
}

type ChartPoint = { label: string; value: number }

const STATUS_LABELS: Record<string, string> = {
  dirty: '더티', cleaning: '청소중', inspect: '점검대기',
}

const STATUS_DOT: Record<string, string> = {
  dirty: C.textDim, cleaning: C.amber, inspect: C.violet,
}

function BarChart({ data }: { data: ChartPoint[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, marginTop: 16 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {d.value > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: C.textMid }}>{d.value}</span>}
          <div style={{ width: '100%', background: C.surface, borderRadius: '4px 4px 0 0', position: 'relative', height: 90 }}>
            <div
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: `linear-gradient(180deg, ${C.accent}, ${C.accent}99)`,
                borderRadius: '4px 4px 0 0',
                height: `${Math.max((d.value / maxVal) * 90, d.value > 0 ? 4 : 0)}px`,
                transition: 'height 0.5s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </div>
          <span style={{ fontSize: 9, color: C.textDim, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center', lineHeight: 1.2 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatsPage() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate]             = useState(today)
  const [period, setPeriod]         = useState<Period>('daily')
  const [hotelId, setHotelId]       = useState('')
  const [loading, setLoading]       = useState(true)

  const [totalRooms, setTotalRooms]       = useState(0)
  const [totalCompleted, setTotalCompleted] = useState(0)
  const [staffStats, setStaffStats]       = useState<StaffStat[]>([])
  const [incomplete, setIncomplete]       = useState<IncompleteRoom[]>([])
  const [chartData, setChartData]         = useState<ChartPoint[]>([])
  const [insights, setInsights]           = useState<string[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const hid = user.app_metadata?.hotel_id as string
      setHotelId(hid)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!hotelId) return
    if (period === 'daily') loadStats()
    else loadChartData(period)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, date, period])

  async function loadStats() {
    setLoading(true)
    const supabase = createClient()
    const dateStart = `${date}T00:00:00+09:00`
    const dateEnd   = `${date}T23:59:59+09:00`

    const [roomsRes, completedRes, staffRes] = await Promise.all([
      supabase.from('rooms').select('id, number, floor, status').eq('hotel_id', hotelId).is('deleted_at', null),
      supabase.from('assignments')
        .select('staff_id, completed_at, assigned_at, staff(name)')
        .not('completed_at', 'is', null)
        .gte('completed_at', dateStart)
        .lte('completed_at', dateEnd),
      supabase.from('staff').select('id, name').eq('hotel_id', hotelId),
    ])

    const rooms     = roomsRes.data ?? []
    const completed = completedRes.data ?? []
    const staffList = staffRes.data ?? []

    setTotalRooms(rooms.length)
    setTotalCompleted(completed.length)
    setIncomplete(rooms
      .filter(r => r.status !== 'done' && r.status !== 'inspect')
      .map(r => ({ number: r.number, floor: r.floor, status: r.status }))
    )

    const statMap: Record<string, { name: string; count: number; totalMin: number }> = {}
    for (const s of staffList) statMap[s.id] = { name: s.name, count: 0, totalMin: 0 }
    for (const a of completed) {
      if (!a.staff_id || !statMap[a.staff_id]) continue
      statMap[a.staff_id].count++
      if (a.assigned_at && a.completed_at) {
        statMap[a.staff_id].totalMin += (new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / 60000
      }
    }

    setStaffStats(
      Object.entries(statMap)
        .filter(([, v]) => v.count > 0)
        .map(([id, v]) => ({
          staffId: id, name: v.name, completed: v.count,
          avgMinutes: v.count > 0 ? Math.round(v.totalMin / v.count) : null,
        }))
        .sort((a, b) => b.completed - a.completed)
    )
    setLoading(false)
  }

  async function fetchInsights() {
    setLoadingInsights(true); setInsights([])
    try {
      const res = await fetch('/api/admin/ai-insight')
      if (res.ok) { const data = await res.json(); setInsights(data.insights ?? []) }
    } catch { /* AI 미연결 */ } finally { setLoadingInsights(false) }
  }

  async function loadChartData(p: Period) {
    setLoading(true)
    const supabase = createClient()
    const days = p === 'weekly' ? 7 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    const { data: completions } = await supabase
      .from('assignments')
      .select('completed_at, rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotelId)
      .gte('completed_at', startDate.toISOString())
      .not('completed_at', 'is', null)

    const countMap: Record<string, number> = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - days + 1 + i)
      countMap[d.toISOString().slice(0, 10)] = 0
    }
    for (const row of completions ?? []) {
      if (!row.completed_at) continue
      const key = new Date(row.completed_at).toISOString().slice(0, 10)
      if (key in countMap) countMap[key]++
    }

    setChartData(Object.entries(countMap).map(([dateKey, value]) => ({
      label: new Date(dateKey).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
      value,
    })))
    setLoading(false)
  }

  const completionRate = totalRooms > 0 ? Math.round((totalCompleted / totalRooms) * 100) : 0
  const maxCompleted = staffStats[0]?.completed ?? 1

  const PERIOD_TABS: { key: Period; label: string }[] = [
    { key: 'daily', label: '일간' },
    { key: 'weekly', label: '주간' },
    { key: 'monthly', label: '월간' },
  ]

  const cardSt: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden',
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter', 'Pretendard', -apple-system, sans-serif" }} className="md:pl-[220px]">
      <AdminNav />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 12 }} className="md:pb-6">
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>통계</h1>

        {/* 기간 탭 */}
        <div style={{ display: 'flex', gap: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {PERIOD_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              style={{
                padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 8,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: period === tab.key ? C.text : 'transparent',
                color: period === tab.key ? C.bg : C.textMid,
                transition: 'all 0.15s',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* 날짜 선택 (일간) */}
        {period === 'daily' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value)}
              style={{
                padding: '8px 12px', background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 8, fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit',
              }}
            />
            {date !== today && (
              <button
                onClick={() => setDate(today)}
                style={{ fontSize: 13, fontWeight: 700, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >오늘로</button>
            )}
            <span style={{ fontSize: 13, color: C.textMid }}>
              {new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <button
              onClick={() => window.open(`/api/admin/stats/export?date=${date}`, '_blank')}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 13, height: 13 }}>
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              CSV
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ ...cardSt, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.7s linear infinite' }}/>
          </div>
        ) : period !== 'daily' ? (
          /* 주간 / 월간 차트 */
          <div style={{ ...cardSt, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                {period === 'weekly' ? '최근 7일 완료 현황' : '최근 30일 완료 현황'}
              </h2>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
                총 {chartData.reduce((s, d) => s + d.value, 0)}건
              </span>
            </div>
            {chartData.length > 0
              ? <BarChart data={chartData} />
              : <p style={{ textAlign: 'center', color: C.textDim, fontSize: 13, padding: '32px 0' }}>데이터가 없습니다</p>
            }
          </div>
        ) : (
          <>
            {/* 요약 카드 3개 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { val: totalCompleted, label: '완료', color: completionRate === 100 ? C.green : C.text },
                { val: totalRooms,     label: '전체 객실', color: C.text },
                { val: `${completionRate}%`, label: '완료율', color: completionRate === 100 ? C.green : C.text },
              ].map(item => (
                <div key={item.label} style={{ ...cardSt, padding: '16px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: item.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{item.val}</p>
                  <p style={{ fontSize: 11, color: C.textDim, marginTop: 6, fontWeight: 500 }}>{item.label}</p>
                </div>
              ))}
            </div>

            {/* 진행률 바 */}
            {totalRooms > 0 && (
              <div style={{ ...cardSt, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>금일 진행률</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textMid }}>{totalCompleted} / {totalRooms}</span>
                </div>
                <div style={{ height: 6, background: C.surface, borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%', borderRadius: 999,
                      background: completionRate === 100
                        ? `linear-gradient(90deg, ${C.green}, ${C.green}99)`
                        : `linear-gradient(90deg, ${C.accent}, ${C.accent}99)`,
                      width: `${completionRate}%`,
                      transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* 직원별 통계 */}
            {staffStats.length > 0 && (
              <div style={cardSt}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                  <h2 style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>직원별 처리 현황</h2>
                </div>
                <div>
                  {staffStats.map((s, idx) => {
                    const isLast = idx === staffStats.length - 1
                    return (
                      <div key={s.staffId} style={{ padding: '12px 18px', borderBottom: isLast ? 'none' : `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, background: `${C.accent}18`, border: `1px solid ${C.accent}25`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>{s.name.charAt(0)}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{s.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {s.avgMinutes != null && <span style={{ fontSize: 11, color: C.textDim }}>평균 {s.avgMinutes}분</span>}
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.completed}개</span>
                          </div>
                        </div>
                        <div style={{ height: 4, background: C.surface, borderRadius: 999, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%', borderRadius: 999,
                              background: `linear-gradient(90deg, ${C.accent}, ${C.accent}80)`,
                              width: `${Math.round((s.completed / maxCompleted) * 100)}%`,
                              transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 미완료 객실 */}
            {incomplete.length > 0 && (
              <div style={cardSt}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>미완료 객실</h2>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>{incomplete.length}개</span>
                </div>
                <div>
                  {incomplete.map((r, i) => {
                    const isLast = i === incomplete.length - 1
                    return (
                      <div key={i} style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isLast ? 'none' : `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT[r.status] ?? C.textDim, flexShrink: 0 }}/>
                          <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{r.number}호</span>
                          <span style={{ fontSize: 11, color: C.textDim }}>{r.floor}층</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.textMid }}>{STATUS_LABELS[r.status] ?? r.status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {staffStats.length === 0 && incomplete.length === 0 && (
              <div style={{ ...cardSt, padding: '60px 0', textAlign: 'center' }}>
                <p style={{ color: C.textDim, fontSize: 13 }}>해당 날짜의 처리 데이터가 없습니다</p>
              </div>
            )}

            {/* AI 인사이트 카드 */}
            <div style={cardSt}>
              <div style={{ padding: '14px 18px', borderBottom: insights.length > 0 ? `1px solid ${C.border}` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>✨</span>
                  <h2 style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>AI 인사이트</h2>
                </div>
                <button
                  onClick={fetchInsights}
                  disabled={loadingInsights}
                  style={{
                    padding: '5px 14px', background: `${C.accent}14`, border: `1px solid ${C.accent}28`,
                    color: C.accent, borderRadius: 999, fontSize: 11, fontWeight: 700,
                    cursor: loadingInsights ? 'not-allowed' : 'pointer', opacity: loadingInsights ? 0.5 : 1,
                    fontFamily: 'inherit',
                  }}
                >{loadingInsights ? '분석 중...' : insights.length > 0 ? '새로고침' : '분석하기'}</button>
              </div>
              {insights.length > 0 && (
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {insights.map((insight, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: `${C.accent}14`, border: `1px solid ${C.accent}25`,
                        color: C.accent, fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                      }}>{i + 1}</span>
                      <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>{insight}</p>
                    </div>
                  ))}
                </div>
              )}
              {!loadingInsights && insights.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: C.textDim }}>분석하기 버튼을 눌러 AI 인사이트를 확인하세요</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
