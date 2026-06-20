'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'qrcode'

type Staff = { id: string; name: string; phone_number: string | null; qr_version: number }
type GuestCode = { code: string; expiresAt: string }

export default function StaffPage() {
  const router = useRouter()
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [hotelId, setHotelId] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

  const [qrModal, setQrModal] = useState<{ name: string; qrUrl: string; staffId: string } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteCount, setDeleteCount] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const [guestCode, setGuestCode] = useState<GuestCode | null>(null)
  const [guestLoading, setGuestLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const hid = user.app_metadata?.hotel_id as string
      setHotelId(hid)
      const { data } = await supabase.from('staff').select('*').eq('hotel_id', hid).order('name')
      setStaffList(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!qrModal?.qrUrl) { setQrDataUrl(''); return }
    QRCode.toDataURL(qrModal.qrUrl, { width: 240, margin: 2 })
      .then(setQrDataUrl)
  }, [qrModal?.qrUrl])

  async function refreshList() {
    const supabase = createClient()
    const { data } = await supabase.from('staff').select('*').eq('hotel_id', hotelId).order('name')
    setStaffList(data ?? [])
  }

  async function handleAdd() {
    if (!form.name.trim()) { setAddError('이름을 입력해 주세요.'); return }
    setSaving(true); setAddError('')
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), phone_number: form.phone.trim() || null }),
    })
    const data = await res.json()
    if (!res.ok) { setAddError('저장 실패'); setSaving(false); return }
    setShowAddModal(false)
    setForm({ name: '', phone: '' })
    setSaving(false)
    await refreshList()
    setQrDataUrl('')
    setQrModal({ name: form.name.trim(), qrUrl: data.qrUrl, staffId: data.staffId })
  }

  async function handleShowQR(staff: Staff) {
    setQrDataUrl('')
    setQrModal({ name: staff.name, qrUrl: '', staffId: staff.id })
    const res = await fetch(`/api/admin/staff/${staff.id}/qr`)
    const data = await res.json()
    if (res.ok) setQrModal(m => m ? { ...m, qrUrl: data.qrUrl } : null)
  }

  async function handleRegenerateQR() {
    if (!qrModal) return
    setQrDataUrl('')
    const res = await fetch(`/api/admin/staff/${qrModal.staffId}/qr`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) { setQrModal(m => m ? { ...m, qrUrl: data.qrUrl } : null); await refreshList() }
  }

  async function handleDelete(force = false) {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/admin/staff/${deleteTarget.id}${force ? '?force=true' : ''}`, { method: 'DELETE' })
    if (res.status === 409) {
      const d = await res.json()
      setDeleteError(`미완료 배정이 ${d.count}건 있습니다. 그래도 삭제하시겠습니까?`)
      setDeleteCount(d.count)
      setDeleting(false)
      return
    }
    await refreshList()
    setDeleteTarget(null)
    setDeleteError('')
    setDeleting(false)
  }

  async function handleGuestCode() {
    setGuestLoading(true)
    const res = await fetch('/api/admin/guest-code', { method: 'POST' })
    setGuestCode(await res.json())
    setGuestLoading(false)
  }

  const guestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guest?h=${hotelId}`

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">불러오는 중...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-5 text-sm">
            <a href="/admin" className="text-gray-400 hover:text-gray-700">현황판</a>
            <a href="/admin/rooms" className="text-gray-400 hover:text-gray-700">객실관리</a>
            <a href="/admin/staff" className="text-gray-900 font-medium border-b-2 border-gray-900 pb-0.5">직원관리</a>
            <a href="/admin/stats" className="text-gray-400 hover:text-gray-700">통계</a>
          </nav>
          <button onClick={() => { setForm({ name: '', phone: '' }); setAddError(''); setShowAddModal(true) }}
            className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium">+ 직원 추가</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 직원 목록 */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {staffList.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">등록된 직원이 없습니다</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이름</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">연락처</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffList.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.phone_number ?? '-'}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => handleShowQR(s)} className="text-xs text-blue-500 hover:text-blue-700">QR 보기/재발급</button>
                      <button onClick={() => { setDeleteTarget(s); setDeleteError(''); setDeleteCount(0) }}
                        className="text-xs text-red-400 hover:text-red-600">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 게스트 코드 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">일일 근무자 접속 코드</h2>
          <p className="text-xs text-gray-400 mb-4">당일 자정 만료 · 카톡으로 전달</p>
          {guestCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold tracking-widest text-gray-900">{guestCode.code}</span>
                <button onClick={() => navigator.clipboard.writeText(guestCode.code)}
                  className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">복사</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 truncate max-w-xs">{guestUrl}</span>
                <button onClick={() => navigator.clipboard.writeText(guestUrl)}
                  className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 shrink-0">URL 복사</button>
              </div>
              <p className="text-xs text-gray-400">만료: {new Date(guestCode.expiresAt).toLocaleString('ko-KR')}</p>
              <button onClick={handleGuestCode} className="text-xs text-gray-400 hover:text-gray-600 underline">코드 재발급</button>
            </div>
          ) : (
            <button onClick={handleGuestCode} disabled={guestLoading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-40">
              {guestLoading ? '발급 중...' : '오늘의 코드 발급'}
            </button>
          )}
        </div>
      </main>

      {/* 직원 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">직원 추가</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">이름 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="홍길동" autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">연락처 (선택)</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
            {addError && <p className="text-xs text-red-500 mt-3">{addError}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-40">
                {saving ? '저장 중...' : '저장 후 QR 발급'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR 모달 */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20 p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 mb-1">{qrModal.name}</h2>
            <p className="text-xs text-gray-400 mb-3">직원이 이 QR을 스캔하면 바로 접속됩니다</p>
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR" className="mx-auto rounded-xl mb-3" width={200} height={200} />
              : <div className="w-[200px] h-[200px] mx-auto bg-gray-100 rounded-xl mb-3 animate-pulse" />
            }
            <button onClick={handleRegenerateQR}
              className="text-xs text-orange-500 hover:text-orange-700 underline mb-4">
              QR 재발급 (기존 QR 무효화)
            </button>
            <div className="flex gap-2">
              <button onClick={() => setQrModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">닫기</button>
              {qrDataUrl && (
                <a href={qrDataUrl} download={`${qrModal.name}_QR.png`}
                  className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium text-center">다운로드</a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <p className="font-medium text-gray-900 mb-2">{deleteTarget.name} 직원을 삭제할까요?</p>
            {deleteError
              ? <p className="text-xs text-orange-500 mb-4">{deleteError}</p>
              : <p className="text-xs text-gray-400 mb-4">QR이 즉시 무효화됩니다</p>
            }
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
              <button onClick={() => handleDelete(!!deleteError)} disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-40">
                {deleteError ? '그래도 삭제' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
