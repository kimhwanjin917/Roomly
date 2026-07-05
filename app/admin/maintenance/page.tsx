'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

type MaintenanceStatus = 'open' | 'in_progress' | 'resolved'

type MaintenanceRequest = {
  id: string
  hotel_id: string
  room_id: string | null
  staff_id: string | null
  description: string
  photo_url: string | null
  status: MaintenanceStatus
  created_at: string
  resolved_at: string | null
  rooms: { number: string; floor: number } | null
  staff: { name: string } | null
}

type FilterTab = 'all' | MaintenanceStatus

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  open: '미처리',
  in_progress: '처리중',
  resolved: '완료',
}

const STATUS_BADGE: Record<MaintenanceStatus, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
}

const NEXT_STATUS: Record<'open' | 'in_progress', MaintenanceStatus> = {
  open: 'in_progress',
  in_progress: 'resolved',
}

const NEXT_STATUS_LABEL: Record<'open' | 'in_progress', string> = {
  open: '처리 시작',
  in_progress: '완료 처리',
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'open', label: '미처리' },
  { key: 'in_progress', label: '처리중' },
  { key: 'resolved', label: '완료' },
]

export default function MaintenancePage() {
  const router = useRouter()
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/maintenance')
    if (res.status === 401) { router.push('/login'); return }
    const data = await res.json() as MaintenanceRequest[]
    setRequests(data)
    setLoading(false)
  }, [router])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      load()
    }
    init()
  }, [router, load])

  async function handleStatusChange(req: MaintenanceRequest) {
    if (req.status === 'resolved') return
    const next = NEXT_STATUS[req.status as 'open' | 'in_progress']
    setUpdating(req.id)
    const res = await fetch('/api/admin/maintenance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: req.id, status: next }),
    })
    if (res.ok) {
      const updated = await res.json() as MaintenanceRequest
      setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
    }
    setUpdating(null)
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const openCount = requests.filter(r => r.status === 'open').length

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-16 md:pb-6 space-y-5">
        {/* 페이지 타이틀 */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-900">유지보수 신고</h1>
          {openCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {openCount}
            </span>
          )}
        </div>

        {/* 필터 탭 */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                filter === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.key === 'open' && openCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">
            불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">
            신고 내역이 없습니다
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filtered.map(req => (
                <div key={req.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* 좌측 정보 */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {req.rooms ? (
                          <span className="font-semibold text-slate-900 text-sm">
                            {req.rooms.number}호 ({req.rooms.floor}층)
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">방 미지정</span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status]}`}>
                          {STATUS_LABEL[req.status]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{req.description}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {req.staff && <span>{req.staff.name}</span>}
                        {req.staff && <span>·</span>}
                        <span>
                          {new Date(req.created_at).toLocaleString('ko-KR', {
                            month: 'numeric', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        {req.resolved_at && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-600">
                              완료 {new Date(req.resolved_at).toLocaleString('ko-KR', {
                                month: 'numeric', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                      {/* 사진 썸네일 */}
                      {req.photo_url && (
                        <a href={req.photo_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={req.photo_url}
                            alt="신고 사진"
                            className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      )}
                    </div>

                    {/* 우측 상태 변경 버튼 */}
                    {req.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange(req)}
                        disabled={updating === req.id}
                        className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                          req.status === 'open'
                            ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                            : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {updating === req.id ? '처리중...' : NEXT_STATUS_LABEL[req.status as 'open' | 'in_progress']}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
