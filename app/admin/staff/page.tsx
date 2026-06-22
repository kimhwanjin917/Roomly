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
  const [hotelName, setHotelName] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

  const [qrModal, setQrModal] = useState<{ name: string; qrUrl: string; staffId: string } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)
  const [deleteError, setDeleteError] = useState('')
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
      const [staffRes, hotelRes] = await Promise.all([
        supabase.from('staff').select('*').eq('hotel_id', hid).order('name'),
        supabase.from('hotels').select('name').eq('id', hid).single(),
      ])
      setStaffList(staffRes.data ?? [])
      setHotelName(hotelRes.data?.name ?? '')
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!qrModal?.qrUrl) { setQrDataUrl(''); return }
    QRCode.toDataURL(qrModal.qrUrl, { width: 240, margin: 2 }).then(setQrDataUrl)
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
      setDeleting(false)
      return
    }
    await refreshList()
    setDeleteTarget(null)
    setDeleteError('')
    setDeleting(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleGuestCode() {
    setGuestLoading(true)
    const res = await fetch('/api/admin/guest-code', { method: 'POST' })
    setGuestCode(await res.json())
    setGuestLoading(false)
  }

  const guestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guest?h=${hotelId}`

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-sm text-slate-400">불러오는 중...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="font-semibold text-slate-800 text-sm hidden sm:block">{hotelName}</span>
            </div>
            <nav className="flex gap-1">
              {[
                { href: '/admin', label: '현황판', active: false },
                { href: '/admin/rooms', label: '객실관리', active: false },
                { href: '/admin/staff', label: '직원관리', active: true },
                { href: '/admin/stats', label: '통계', active: false },
              ].map(n => (
                <a key={n.href} href={n.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    n.active ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >{n.label}</a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setForm({ name: '', phone: '' }); setAddError(''); setShowAddModal(true) }}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >+ 직원 추가</button>
            <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* 직원 목록 */}
        <div>
          <h1 className="text-base font-semibold text-slate-900 mb-3">직원 목록 <span className="text-slate-400 font-normal ml-1">{staffList.length}명</span></h1>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {staffList.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm">등록된 직원이 없습니다</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">이름</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">연락처</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{s.phone_number ?? '—'}</td>
                      <td className="px-4 py-3 text-right space-x-3">
                        <button onClick={() => handleShowQR(s)} className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">QR 발급</button>
                        <button
                          onClick={() => { setDeleteTarget(s); setDeleteError('') }}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 게스트 코드 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">일일 근무자 접속 코드</h2>
              <p className="text-xs text-slate-400 mt-0.5">당일 자정 만료 · 카카오톡 또는 문자로 전달</p>
            </div>
            {guestCode && (
              <button onClick={handleGuestCode} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">재발급</button>
            )}
          </div>

          {guestCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold tracking-[0.2em] text-slate-900 font-mono">{guestCode.code}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(guestCode.code)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                >복사</button>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-400 truncate flex-1">{guestUrl}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(guestUrl)}
                  className="text-xs text-slate-500 hover:text-slate-700 shrink-0 transition-colors font-medium"
                >URL 복사</button>
              </div>
              <p className="text-xs text-slate-400">만료: {new Date(guestCode.expiresAt).toLocaleString('ko-KR')}</p>
            </div>
          ) : (
            <button
              onClick={handleGuestCode}
              disabled={guestLoading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
            >
              {guestLoading ? '발급 중...' : '오늘의 코드 발급'}
            </button>
          )}
        </div>
      </main>

      {/* 직원 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-slate-900 mb-4">직원 추가</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">이름</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="홍길동"
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">연락처 <span className="text-slate-300 normal-case font-normal">(선택)</span></label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            {addError && <p className="text-xs text-red-500 mt-3">{addError}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">취소</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                {saving ? '저장 중...' : '저장 후 QR 발급'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR 모달 */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-5 text-center" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-slate-900 mb-0.5">{qrModal.name}</h2>
            <p className="text-xs text-slate-400 mb-4">이 QR을 스캔하면 바로 업무 화면으로 접속됩니다</p>
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR" className="mx-auto rounded-xl mb-4 border border-slate-100" width={200} height={200} />
              : <div className="w-[200px] h-[200px] mx-auto bg-slate-100 rounded-xl mb-4 animate-pulse" />
            }
            <button onClick={handleRegenerateQR} className="text-xs text-amber-600 hover:text-amber-800 underline mb-4 block mx-auto transition-colors">
              QR 재발급 (기존 무효화)
            </button>
            <div className="flex gap-2">
              <button onClick={() => setQrModal(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">닫기</button>
              {qrDataUrl && (
                <a href={qrDataUrl} download={`${qrModal.name}_QR.png`}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-sm font-medium text-center transition-colors">
                  다운로드
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-5 text-center" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-slate-900 mb-2">{deleteTarget.name} 직원을 삭제할까요?</p>
            {deleteError
              ? <p className="text-xs text-amber-600 mb-4">{deleteError}</p>
              : <p className="text-xs text-slate-400 mb-4">QR이 즉시 무효화됩니다</p>
            }
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">취소</button>
              <button onClick={() => handleDelete(!!deleteError)} disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                {deleteError ? '그래도 삭제' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
