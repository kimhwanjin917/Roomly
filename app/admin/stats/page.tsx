'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

export default function StatsPage() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [hotelId, setHotelId] = useState('')
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
      setHotelId(user.app_metadata?.hotel_id)
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
      number: r.number, floor: r.floor, status: r.status
    })))

    const statMap: Record<string, { name: string; count: number; totalMin: number }> = {}
    for (const s of staffList) {
      statMap[s.id] = { name: s.name, count: 0, totalMin: 0 }
    }
    for (const a of completed) {
      if (!a.staff_id || !statMap[a.staff_id]) continue
      statMap[a.staff_id].count++
      if (a.assigned_at && a.completed_at) {
        const mins = (new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / 60000
        statMap[a.staff_id].totalMin += mins
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

  const STATUS_LABELS: Record<string, string> = {
    dirty: '더티', cleaning: '청소중', inspect: '점검대기',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
          <nav className="flex items-center gap-5 text-sm">
            <a href="/admin" className="text-gray-400 hover:text-gray-700">현황판</a>
            <a href="/admin/rooms" className="text-gray-400 hover:text-gray-700">객실관리</a>
            <a href="/admin/staff" className="text-gray-400 hover:text-gray-700">직원관리</a>
            <a href="/admin/stats" className="text-gray-900 font-medium border-b-2 border-gray-900 pb-0.5">통계</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* 날짜 선택 */}
        <div className="flex items-center gap-3">
          <input type="date" value={date} max={today}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" />
          {date !== today && (
            <button onClick={() => setDate(today)} className="text-xs text-gray-500 hover:text-gray-800">오늘로</button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">불러오는 중...</div>
        ) : (
          <>
            {/* 요약 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-3xl font-bold text-gray-900">{totalCompleted}</p>
                <p className="text-xs text-gray-400 mt-1">완료</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-3xl font-bold text-gray-900">{totalRooms}</p>
                <p className="text-xs text-gray-400 mt-1">전체 객실</p>
              </div>
            </div>

            {/* 직원별 통계 */}
            {staffStats.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-sm">직원별 처리 현황</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">직원</th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">완료</th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">평균 처리시간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffStats.map(s => (
                      <tr key={s.staffId}>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{s.completed}개</td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {s.avgMinutes != null ? `${s.avgMinutes}분` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 미완료 객실 */}
            {incomplete.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-sm">미완료 객실 ({incomplete.length}개)</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {incomplete.map((r, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <span className="font-medium text-gray-900">{r.number}호 <span className="text-gray-400 font-normal text-xs">{r.floor}층</span></span>
                      <span className="text-xs text-gray-500">{STATUS_LABELS[r.status] ?? r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {staffStats.length === 0 && incomplete.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">해당 날짜 데이터가 없습니다</div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
