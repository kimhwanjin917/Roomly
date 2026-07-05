'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

type Supply = {
  id: string
  hotel_id: string
  name: string
  unit: string
  stock: number
  min_stock: number
  created_at: string
}

type ModalState = {
  open: boolean
  mode: 'add' | 'edit'
  target: Supply | null
}

const EMPTY_FORM = { name: '', unit: '개', stock: 0, min_stock: 5 }

export default function SuppliesPage() {
  const router = useRouter()
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'add', target: null })
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
    }
    checkAuth()
  }, [router])

  const loadSupplies = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/supplies')
    if (res.ok) {
      const data: Supply[] = await res.json()
      setSupplies(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSupplies()
  }, [loadSupplies])

  function openAdd() {
    setForm(EMPTY_FORM)
    setModal({ open: true, mode: 'add', target: null })
  }

  function openEdit(supply: Supply) {
    setForm({ name: supply.name, unit: supply.unit, stock: supply.stock, min_stock: supply.min_stock })
    setModal({ open: true, mode: 'edit', target: supply })
  }

  function closeModal() {
    setModal({ open: false, mode: 'add', target: null })
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const body =
      modal.mode === 'add'
        ? { name: form.name, unit: form.unit, stock: Number(form.stock), min_stock: Number(form.min_stock) }
        : { id: modal.target!.id, name: form.name, unit: form.unit, stock: Number(form.stock), min_stock: Number(form.min_stock) }

    const res = await fetch('/api/admin/supplies', {
      method: modal.mode === 'add' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (res.ok) {
      closeModal()
      await loadSupplies()
    }
  }

  const lowStock = (s: Supply) => s.stock < s.min_stock

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-16 md:pb-6 space-y-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">비품 관리</h1>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 비품 추가
          </button>
        </div>

        {/* 비품 테이블 */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">
            불러오는 중...
          </div>
        ) : supplies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">
            등록된 비품이 없습니다
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* 테이블 헤더 */}
            <div className="hidden md:grid grid-cols-[1fr_80px_100px_100px_80px_80px] gap-0 px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
              <span>이름</span>
              <span className="text-center">단위</span>
              <span className="text-center">현재 재고</span>
              <span className="text-center">최소 재고</span>
              <span className="text-center">오늘 사용</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {supplies.map(s => (
                <div
                  key={s.id}
                  className={`px-4 py-3 flex md:grid md:grid-cols-[1fr_80px_100px_100px_80px_80px] items-center gap-3 md:gap-0 ${
                    lowStock(s) ? 'bg-red-50' : ''
                  }`}
                >
                  {/* 이름 */}
                  <span className={`text-sm font-medium flex-1 ${lowStock(s) ? 'text-red-600' : 'text-slate-900'}`}>
                    {s.name}
                    {lowStock(s) && (
                      <span className="ml-2 inline-block text-[10px] font-semibold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">
                        부족
                      </span>
                    )}
                  </span>

                  {/* 단위 */}
                  <span className="text-sm text-slate-500 md:text-center hidden md:block">{s.unit}</span>

                  {/* 현재 재고 */}
                  <span className={`text-sm font-semibold md:text-center ${lowStock(s) ? 'text-red-600' : 'text-slate-900'}`}>
                    {s.stock}
                    <span className="md:hidden text-slate-400 font-normal text-xs ml-0.5">{s.unit}</span>
                  </span>

                  {/* 최소 재고 */}
                  <span className="text-sm text-slate-400 md:text-center hidden md:block">{s.min_stock}</span>

                  {/* 오늘 사용량 */}
                  <span className="text-sm text-slate-400 md:text-center hidden md:block">—</span>

                  {/* 수정 버튼 */}
                  <div className="md:text-center">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors px-2 py-1 rounded hover:bg-blue-50"
                    >
                      수정
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 추가/수정 모달 */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              {modal.mode === 'add' ? '비품 추가' : '비품 수정'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 이름 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">이름</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예: 수건, 어메니티"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 단위 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">단위</label>
                <input
                  type="text"
                  required
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="예: 개, 세트, 박스"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 초기 재고 / 최소 재고 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {modal.mode === 'add' ? '초기 재고' : '현재 재고'}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">최소 재고</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.min_stock}
                    onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? '저장 중...' : modal.mode === 'add' ? '추가' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
