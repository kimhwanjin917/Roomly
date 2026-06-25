'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

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
  dirty: 'bg-slate-400', cleaning: 'bg-amber-400', inspect: 'bg-violet-500',
}

function BarChart({ data }: { data: ChartPoint[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-36 mt-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          {d.value > 0 && (
            <span className="text-[10px] font-bold text-[#6B7684]">{d.value}</span>
          )}
          <div className="w-full bg-[#F2F4F6] rounded-t-lg relative" style={{ height: '80px' }}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-toss-blue rounded-t-lg transition-all duration-500"
              style={{ height: `${Math.max((d.value / maxVal) * 80, d.value > 0 ? 4 : 0)}px` }}
            />
          </div>
          <span className="text-[9px] text-[#B0B8C1] font-medium truncate w-full text-center leading-tight">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatsPage() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [period, setPeriod] = useState<Period>('daily')
  const [hotelId, setHotelId] = useState('')
  const [loading, setLoading] = useState(true)

  const [totalRooms, setTotalRooms] = useState(0)
  const [totalCompleted, setTotalCompleted] = useState(0)
  const [staffStats, setStaffStats] = useState<StaffStat[]>([])
  const [incomplete, setIncomplete] = useState<IncompleteRoom[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])

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
    const dateEnd = `${date}T23:59:59+09:00`

    const [roomsRes, completedRes, staffRes] = await Promise.all([
      supabase.from('rooms').select('id, number, floor, status').eq('hotel_id', hotelId).is('deleted_at', null),
      supabase.from('assignments')
        .select('staff_id, completed_at, assigned_at, staff(name)')
        .not('completed_at', 'is', null)
        .gte('completed_at', dateStart)
        .lte('completed_at', dateEnd),
      supabase.from('staff').select('id, name').eq('hotel_id', hotelId),
    ])

    const rooms = roomsRes.data ?? []
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
          staffId: id,
          name: v.name,
          completed: v.count,
          avgMinutes: v.count > 0 ? Math.round(v.totalMin / v.count) : null,
        }))
        .sort((a, b) => b.completed - a.completed)
    )

    setLoading(false)
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
      const d = new Date()
      d.setDate(d.getDate() - days + 1 + i)
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

  return (
    <div className="min-h-screen bg-toss-bg">
      <AdminNav />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-4">
        {/* 헤더 */}
        <div>
          <h1 className="text-xl font-bold text-[#191919]">통계</h1>
        </div>

        {/* 기간 탭 */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-card w-fit">
          {PERIOD_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${
                period === tab.key
                  ? 'bg-[#191919] text-white shadow-sm'
                  : 'text-[#B0B8C1] hover:text-[#6B7684]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 날짜 선택 (일간) */}
        {period === 'daily' && (
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value)}
              className="px-4 py-2.5 bg-white rounded-xl text-sm text-[#191919] shadow-card focus:outline-none focus:ring-2 focus:ring-toss-blue transition-all"
            />
            {date !== today && (
              <button
                onClick={() => setDate(today)}
                className="text-sm font-bold text-toss-blue hover:text-toss-blue-hover transition-colors"
              >오늘로</button>
            )}
            <span className="text-sm text-[#6B7684] font-medium">
              {new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <button
              onClick={() => window.open(`/api/admin/stats/export?date=${date}`, '_blank')}
              className="ml-auto flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-xl text-sm font-semibold text-[#6B7684] shadow-card hover:bg-[#F8F9FB] transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              CSV
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl shadow-card py-20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : period !== 'daily' ? (
          /* 주간 / 월간 차트 */
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-[#191919]">
                {period === 'weekly' ? '최근 7일 완료 현황' : '최근 30일 완료 현황'}
              </h2>
              <span className="text-sm font-bold text-toss-blue">
                총 {chartData.reduce((s, d) => s + d.value, 0)}건
              </span>
            </div>
            {chartData.length > 0 ? (
              <BarChart data={chartData} />
            ) : (
              <p className="text-center text-[#B0B8C1] text-sm py-10">데이터가 없습니다</p>
            )}
          </div>
        ) : (
          <>
            {/* 요약 카드 3개 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl shadow-card p-4 text-center">
                <p className="text-3xl font-bold text-[#191919] leading-none">{totalCompleted}</p>
                <p className="text-xs text-[#B0B8C1] font-medium mt-1.5">완료</p>
              </div>
              <div className="bg-white rounded-2xl shadow-card p-4 text-center">
                <p className="text-3xl font-bold text-[#191919] leading-none">{totalRooms}</p>
                <p className="text-xs text-[#B0B8C1] font-medium mt-1.5">전체 객실</p>
              </div>
              <div className="bg-white rounded-2xl shadow-card p-4 text-center">
                <p className={`text-3xl font-bold leading-none ${completionRate === 100 ? 'text-toss-success' : 'text-[#191919]'}`}>
                  {completionRate}<span className="text-lg">%</span>
                </p>
                <p className="text-xs text-[#B0B8C1] font-medium mt-1.5">완료율</p>
              </div>
            </div>

            {/* 진행률 바 */}
            {totalRooms > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-[#191919]">금일 진행률</span>
                  <span className="text-sm font-bold text-[#6B7684]">{totalCompleted} / {totalRooms}</span>
                </div>
                <div className="h-2 bg-[#F2F4F6] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${completionRate === 100 ? 'bg-toss-success' : 'bg-toss-blue'}`}
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            )}

            {/* 직원별 통계 */}
            {staffStats.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #F2F4F6' }}>
                  <h2 className="font-bold text-[#191919]">직원별 처리 현황</h2>
                </div>
                <div>
                  {staffStats.map((s, idx) => {
                    const isLast = idx === staffStats.length - 1
                    return (
                      <div
                        key={s.staffId}
                        className="px-5 py-4"
                        style={!isLast ? { borderBottom: '1px solid #F2F4F6' } : undefined}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#EBF3FF] rounded-xl flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-toss-blue">{s.name.charAt(0)}</span>
                            </div>
                            <span className="font-bold text-[#191919] text-sm">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {s.avgMinutes != null && (
                              <span className="text-xs text-[#B0B8C1] font-medium">평균 {s.avgMinutes}분</span>
                            )}
                            <span className="text-sm font-bold text-[#191919]">{s.completed}개</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#F2F4F6] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-toss-blue rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((s.completed / maxCompleted) * 100)}%` }}
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
              <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F2F4F6' }}>
                  <h2 className="font-bold text-[#191919]">미완료 객실</h2>
                  <span className="text-sm font-bold text-toss-error">{incomplete.length}개</span>
                </div>
                <div>
                  {incomplete.map((r, i) => {
                    const isLast = i === incomplete.length - 1
                    return (
                      <div
                        key={i}
                        className="px-5 py-3.5 flex items-center justify-between"
                        style={!isLast ? { borderBottom: '1px solid #F2F4F6' } : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[r.status] ?? 'bg-slate-300'}`} />
                          <span className="font-bold text-[#191919] text-sm">{r.number}호</span>
                          <span className="text-xs text-[#B0B8C1]">{r.floor}층</span>
                        </div>
                        <span className="text-xs font-semibold text-[#6B7684]">
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {staffStats.length === 0 && incomplete.length === 0 && (
              <div className="bg-white rounded-2xl shadow-card py-20 text-center">
                <p className="text-[#B0B8C1] text-sm font-medium">해당 날짜의 처리 데이터가 없습니다</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
