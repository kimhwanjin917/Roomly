'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HotelStat = {
  hotelId: string
  name: string
  totalRooms: number
  completedToday: number
  completionRate: number
  incompleteCount: number
  cleaningCount: number
}

const POLL_INTERVAL_MS = 30_000

/** 기존 stats 페이지의 div 기반 바 차트 패턴 재사용 (recharts 미사용) */
function CompareBarChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-32 mt-4 overflow-x-auto">
      {data.map((d, i) => (
        <div key={i} className="flex-1 min-w-[48px] flex flex-col items-center gap-1">
          <span className="text-xs text-slate-500">{d.value}%</span>
          <div className="w-full bg-slate-100 rounded-t relative" style={{ height: '80px' }}>
            <div
              className={`absolute bottom-0 left-0 right-0 rounded-t transition-all ${d.value === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ height: `${(d.value / maxVal) * 80}px` }}
            />
          </div>
          <span className="text-xs text-slate-600 truncate w-full text-center" title={d.label}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function OrgDashboard({ orgName }: { orgName: string }) {
  const router = useRouter()
  const [hotels, setHotels] = useState<HotelStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/hotels', { cache: 'no-store' })
      if (res.status === 401 || res.status === 403) {
        router.push('/login')
        return
      }
      if (!res.ok) {
        setError('데이터를 불러오지 못했습니다.')
        return
      }
      const data = await res.json()
      setHotels(data.hotels ?? [])
      setError('')
      setUpdatedAt(new Date())
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [router])

  // 초기 로드 + 30초 폴링
  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [load])

  const totalIncomplete = hotels.reduce((s, h) => s + h.incompleteCount, 0)
  const totalCleaning = hotels.reduce((s, h) => s + h.cleaningCount, 0)
  const avgRate = hotels.length > 0
    ? Math.round(hotels.reduce((s, h) => s + h.completionRate, 0) / hotels.length)
    : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">{orgName}</h1>
              <p className="text-xs text-slate-500">체인 호텔 통합 현황판</p>
            </div>
          </div>
          {updatedAt && (
            <span className="text-xs text-slate-400">
              {updatedAt.toLocaleTimeString('ko-KR')} 갱신 · 30초마다 자동 새로고침
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">
            불러오는 중...
          </div>
        ) : hotels.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">
            소속 호텔이 없습니다. 호텔에 조직을 연결해주세요.
          </div>
        ) : (
          <>
            {/* 조직 전체 요약 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className={`text-3xl font-bold ${avgRate === 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {avgRate}<span className="text-lg">%</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">평균 완료율</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className="text-3xl font-bold text-slate-900">{totalIncomplete}</p>
                <p className="text-xs text-slate-400 mt-1">미완료 객실</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className="text-3xl font-bold text-slate-900">{totalCleaning}</p>
                <p className="text-xs text-slate-400 mt-1">청소중</p>
              </div>
            </div>

            {/* 호텔 카드 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {hotels.map(h => (
                <div
                  key={h.hotelId}
                  title="개별 호텔 관리 화면은 해당 호텔 관리자로 로그인 필요"
                  className="bg-white rounded-2xl border border-slate-200 p-4 cursor-default"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-900 truncate">{h.name}</h2>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">객실 {h.totalRooms}</span>
                  </div>

                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">오늘 완료율</span>
                    <span className={`text-sm font-bold ${h.completionRate === 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {h.completionRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${h.completionRate === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${h.completionRate}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      미완료 <span className="font-semibold text-slate-700">{h.incompleteCount}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      청소중 <span className="font-semibold text-slate-700">{h.cleaningCount}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 프로퍼티별 완료율 비교 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900">프로퍼티별 완료율 비교</h2>
              <CompareBarChart data={hotels.map(h => ({ label: h.name, value: h.completionRate }))} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
