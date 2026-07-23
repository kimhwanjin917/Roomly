'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

type MaintenanceRequest = {
  id: string
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  reported_at: string
  resolved_at: string | null
  staff: { name: string } | null
  rooms: { number: string; floor: number } | null
}

const STATUS_CONFIG = {
  open:        { label: '접수', bg: 'bg-amber-50',   text: 'text-amber-700' },
  in_progress: { label: '처리중', bg: 'bg-blue-50',  text: 'text-blue-700' },
  resolved:    { label: '완료',  bg: 'bg-emerald-50', text: 'text-emerald-700' },
}

export default function MaintenancePage() {
  const router = useRouter()
  const [items, setItems] = useState<MaintenanceRequest[]>([])
  const [hotelId, setHotelId] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string | null>('open')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setHotelId(user.app_metadata?.hotel_id as string)
      await refresh(user.app_metadata?.hotel_id as string)
      setLoading(false)
    }
    load()
  }, [router])

  async function refresh(hid?: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('maintenance_requests')
      .select('*, staff(name), rooms(number, floor)')
      .eq('hotel_id', hid ?? hotelId)
      .order('reported_at', { ascending: false })
    setItems(data as unknown as MaintenanceRequest[] ?? [])
  }

  async function updateStatus(id: string, status: 'open' | 'in_progress' | 'resolved') {
    setUpdating(id)
    const supabase = createClient()
    await supabase.from('maintenance_requests').update({
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status, resolved_at: status === 'resolved' ? new Date().toISOString() : null } : i))
    setUpdating(null)
  }

  const filtered = filterStatus ? items.filter(i => i.status === filterStatus) : items

  if (loading) return <div className="min-h-screen bg-toss-bg md:pl-[220px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-toss-bg md:pl-[220px]">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-4 py-5 pb-20">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-[#191919]">유지보수 관리</h1>
          <span className="text-sm text-[#6B7684]">총 {items.length}건</span>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([null, 'open', 'in_progress', 'resolved'] as const).map(s => (
            <button
              key={s ?? 'all'}
              onClick={() => setFilterStatus(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterStatus === s ? 'bg-[#191919] text-white' : 'bg-white text-[#6B7684] shadow-card'
              }`}
            >
              {s === null ? '전체' : STATUS_CONFIG[s].label}
              {s !== null && ` (${items.filter(i => i.status === s).length})`}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl shadow-card p-12 text-center text-[#B0B8C1] text-sm">신고된 유지보수 항목이 없습니다</div>
          )}
          {filtered.map(item => {
            const cfg = STATUS_CONFIG[item.status]
            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      {item.rooms && (
                        <span className="text-xs text-[#6B7684]">{item.rooms.floor}층 {item.rooms.number}호</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#191919] leading-relaxed">{item.description}</p>
                    <p className="text-xs text-[#B0B8C1] mt-2">
                      {item.staff?.name ?? '—'} · {new Date(item.reported_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* 상태 변경 */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {item.status === 'open' && (
                      <button
                        disabled={updating === item.id}
                        onClick={() => updateStatus(item.id, 'in_progress')}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg disabled:opacity-40"
                      >처리 시작</button>
                    )}
                    {item.status === 'in_progress' && (
                      <button
                        disabled={updating === item.id}
                        onClick={() => updateStatus(item.id, 'resolved')}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg disabled:opacity-40"
                      >완료 처리</button>
                    )}
                    {item.status === 'resolved' && (
                      <button
                        disabled={updating === item.id}
                        onClick={() => updateStatus(item.id, 'open')}
                        className="px-3 py-1.5 bg-[#F2F4F6] text-[#6B7684] text-xs font-bold rounded-lg disabled:opacity-40"
                      >재오픈</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
