'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

type Supply = {
  id: string
  name: string
  unit: string
  stock: number
  low_stock: number
}

type Request = {
  id: string
  supply_id: string
  qty: number
  note: string | null
  status: 'pending' | 'fulfilled'
  requested_at: string
  staff: { name: string } | null
  rooms: { number: string } | null
  supplies: { name: string; unit: string } | null
}

export default function SuppliesPage() {
  const router = useRouter()
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [hotelId, setHotelId] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'stock' | 'requests'>('requests')

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', unit: '개', stock: '0', low_stock: '5' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const hid = user.app_metadata?.hotel_id as string
      setHotelId(hid)

      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.from('supplies').select('*').eq('hotel_id', hid).order('name'),
        supabase.from('supply_requests')
          .select('*, staff(name), rooms(number), supplies(name, unit)')
          .eq('hotel_id', hid)
          .order('requested_at', { ascending: false })
          .limit(50),
      ])
      setSupplies(s ?? [])
      setRequests(r as unknown as Request[] ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  async function addSupply() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('supplies').insert({
      hotel_id: hotelId,
      name: form.name,
      unit: form.unit,
      stock: Number(form.stock),
      low_stock: Number(form.low_stock),
    })
    const { data } = await supabase.from('supplies').select('*').eq('hotel_id', hotelId).order('name')
    setSupplies(data ?? [])
    setShowAdd(false)
    setForm({ name: '', unit: '개', stock: '0', low_stock: '5' })
    setSaving(false)
  }

  async function updateStock(id: string, delta: number) {
    const supabase = createClient()
    const supply = supplies.find(s => s.id === id)
    if (!supply) return
    const newStock = Math.max(0, supply.stock + delta)
    await supabase.from('supplies').update({ stock: newStock }).eq('id', id)
    setSupplies(prev => prev.map(s => s.id === id ? { ...s, stock: newStock } : s))
  }

  async function fulfillRequest(id: string) {
    const supabase = createClient()
    await supabase.from('supply_requests').update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'fulfilled' } : r))
  }

  if (loading) return <div className="min-h-screen bg-toss-bg md:pl-[220px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-toss-bg md:pl-[220px]">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-4 py-5 pb-20">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-[#191919]">비품 관리</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-toss-blue text-white text-sm font-bold rounded-xl"
          >+ 비품 추가</button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-4 bg-white rounded-2xl p-1 shadow-card">
          {(['requests', 'stock'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${tab === t ? 'bg-[#191919] text-white' : 'text-[#6B7684]'}`}
            >
              {t === 'requests' ? `요청 목록 (${requests.filter(r => r.status === 'pending').length})` : '재고 현황'}
            </button>
          ))}
        </div>

        {/* 요청 목록 */}
        {tab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 && (
              <div className="bg-white rounded-2xl shadow-card p-12 text-center text-[#B0B8C1] text-sm">직원 요청이 없습니다</div>
            )}
            {requests.map(r => (
              <div key={r.id} className={`bg-white rounded-2xl shadow-card p-4 ${r.status === 'fulfilled' ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#191919]">{r.supplies?.name} × {r.qty}{r.supplies?.unit}</p>
                    <p className="text-xs text-[#6B7684] mt-0.5">
                      {r.staff?.name ?? '게스트'} · {r.rooms?.number ? `${r.rooms.number}호` : '—'} · {new Date(r.requested_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {r.note && <p className="text-xs text-[#B0B8C1] mt-1">{r.note}</p>}
                  </div>
                  {r.status === 'pending' && (
                    <button
                      onClick={() => fulfillRequest(r.id)}
                      className="px-3 py-1.5 bg-toss-success text-white text-xs font-bold rounded-lg"
                    >완료</button>
                  )}
                  {r.status === 'fulfilled' && (
                    <span className="text-xs text-toss-success font-bold">처리됨</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 재고 현황 */}
        {tab === 'stock' && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {supplies.length === 0 && (
              <div className="p-12 text-center text-[#B0B8C1] text-sm">등록된 비품이 없습니다</div>
            )}
            {supplies.map((s, idx) => (
              <div
                key={s.id}
                className={`flex items-center justify-between px-5 py-4 ${idx < supplies.length - 1 ? 'border-b border-[#F2F4F6]' : ''}`}
              >
                <div>
                  <p className="font-bold text-[#191919]">{s.name}</p>
                  <p className="text-xs text-[#6B7684]">최소 재고: {s.low_stock}{s.unit}</p>
                </div>
                <div className="flex items-center gap-3">
                  {s.stock <= s.low_stock && (
                    <span className="text-xs bg-[#FFF0F0] text-toss-error font-bold px-2 py-0.5 rounded-full">부족</span>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateStock(s.id, -1)} className="w-7 h-7 rounded-full bg-[#F2F4F6] text-[#191919] font-bold text-sm flex items-center justify-center">−</button>
                    <span className="w-10 text-center font-bold text-[#191919]">{s.stock}{s.unit}</span>
                    <button onClick={() => updateStock(s.id, 1)} className="w-7 h-7 rounded-full bg-[#F2F4F6] text-[#191919] font-bold text-sm flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 비품 추가 모달 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[#191919] text-lg mb-5">비품 추가</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="비품명 (예: 타월)" className="w-full px-4 py-3 bg-[#F2F4F6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue" />
              <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="단위 (예: 개, 롤)" className="w-full px-4 py-3 bg-[#F2F4F6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue" />
              <div className="flex gap-3">
                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="현재 재고" className="flex-1 px-4 py-3 bg-[#F2F4F6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue" />
                <input type="number" value={form.low_stock} onChange={e => setForm(f => ({ ...f, low_stock: e.target.value }))} placeholder="최소 재고" className="flex-1 px-4 py-3 bg-[#F2F4F6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3.5 bg-[#F2F4F6] rounded-xl text-sm font-bold text-[#191919]">취소</button>
              <button onClick={addSupply} disabled={!form.name || saving} className="flex-1 py-3.5 bg-toss-blue text-white rounded-xl text-sm font-bold disabled:opacity-40">{saving ? '추가 중...' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
