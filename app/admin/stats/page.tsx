'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

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

const STATUS_LABELS: Record<string, string> = {
  dirty: '더티', cleaning: '청소중', inspect: '점검대기',
}

const STATUS_DOTS: Record<string, string> = {
  dirty: 'bg-slate-400', cleaning: 'bg-amber-400', inspect: 'bg-violet-500',
}

export default function StatsPage() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [hotelId, setHotelId] = useState('')
  const [hotelName, setHotelName] = useState('')
  const [loading, setLoading] = useState(true)

  const [totalRooms, setTotalRooms] = useState(0)
  const [totalCompleted, setTotalCompleted] = useState(0)
  const [staffStats, setStaffStats] = useState<StaffStat[]>([])
  const [incomplete, setIncomplete] = useState<IncompleteRoom[]>([])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const hid = user.app_metadata?.hotel_id as string
      setHotelId(hid)
      const hotelRes = await supabase.from('hotels').select('name').eq('id', hid).single()
      setHotelName(hotelRes.data?.name ?? '')
    }
    init()
  }, [router])

  useEffect(() => {
    if (!hotelId) return
    loadStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, date])

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
    setIncomplete(rooms.filter(r => r.status !== 'done' && r.status !== 'inspect').map(r => ({
      number: r.number, floor: r.floor, status: r.status,
    })))

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

  const completionRate = totalRooms > 0 ? Math.round((totalCompleted / totalRooms) * 100) : 0
  const maxCompleted = staffStats[0]?.completed ?? 1

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-16 md:pb-6 space-y-5">
        {/* 날짜 선택 */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {date !== today && (
            <button onClick={() => setDate(today)} className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">오늘로</button>
          )}
          <span className="text-sm text-slate-500 ml-auto">
            {new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">불러오는 중...</div>
        ) : (
          <>
            {/* 요약 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className="text-3xl font-bold text-slate-900">{totalCompleted}</p>
                <p className="text-xs text-slate-400 mt-1">완료</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className="text-3xl font-bold text-slate-900">{totalRooms}</p>
                <p className="text-xs text-slate-400 mt-1">전체 객실</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className={`text-3xl font-bold ${completionRate === 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {completionRate}<span className="text-lg">%</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">완료율</p>
              </div>
            </div>

            {/* 완료율 바 */}
            {totalRooms > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">금일 진행률</span>
                  <span className="text-xs text-slate-500">{totalCompleted} / {totalRooms}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${completionRate === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            )}

            {/* 직원별 통계 */}
            {staffStats.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900">직원별 처리 현황</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {staffStats.map(s => (
                    <div key={s.staffId} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-900">{s.name}</span>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {s.avgMinutes != null && <span>평균 {s.avgMinutes}분</span>}
                          <span className="font-semibold text-slate-700">{s.completed}개</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((s.completed / maxCompleted) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 미완료 객실 */}
            {incomplete.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">미완료 객실</h2>
                  <span className="text-xs text-slate-400">{incomplete.length}개</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {incomplete.map((r, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[r.status] ?? 'bg-slate-300'}`} />
                        <span className="font-medium text-slate-900 text-sm">{r.number}호</span>
                        <span className="text-xs text-slate-400">{r.floor}층</span>
                      </div>
                      <span className="text-xs text-slate-500">{STATUS_LABELS[r.status] ?? r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {staffStats.length === 0 && incomplete.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">
                해당 날짜의 처리 데이터가 없습니다
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
