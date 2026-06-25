'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'qrcode'
import AdminNav from '@/components/AdminNav'

type Staff = { id: string; name: string; phone_number: string | null; qr_version: number; role: string }
type GuestCode = { code: string; expiresAt: string }

export default function StaffPage() {
  const router = useRouter()
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [hotelId, setHotelId] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', role: 'housekeeping' })
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
      const { data: staffData } = await supabase.from('staff').select('*').eq('hotel_id', hid).order('name')
      setStaffList(staffData ?? [])
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
      body: JSON.stringify({ name: form.name.trim(), phone_number: form.phone.trim() || null, role: form.role }),
    })
    const data = await res.json()
    if (!res.ok) { setAddError('저장 실패'); setSaving(false); return }
    setShowAddModal(false)
    setForm({ name: '', phone: '', role: 'housekeeping' })
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

  async function handleGuestCode() {
    setGuestLoading(true)
    const res = await fetch('/api/admin/guest-code', { method: 'POST' })
    setGuestCode(await res.json())
    setGuestLoading(false)
  }

  const guestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guest?h=${hotelId}`

  if (loading) return (
    <div className="min-h-screen bg-toss-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-toss-bg">
      <AdminNav />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-4">
        {/* 직원 목록 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#191919]">직원 관리</h1>
              <p className="text-sm text-[#B0B8C1] mt-0.5">{staffList.length}명 등록됨</p>
            </div>
            <button
              onClick={() => { setForm({ name: '', phone: '', role: 'housekeeping' }); setAddError(''); setShowAddModal(true) }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl text-sm font-bold transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              직원 추가
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {staffList.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-12 h-12 bg-[#F2F4F6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth={1.5} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                </div>
                <p className="text-[#191919] font-bold mb-1">등록된 직원이 없습니다</p>
                <p className="text-sm text-[#B0B8C1]">직원을 추가하면 QR로 접속할 수 있습니다</p>
              </div>
            ) : (
              <div>
                {staffList.map((s, idx) => {
                  const isLast = idx === staffList.length - 1
                  return (
                    <div
                      key={s.id}
                      className="px-5 py-4 flex items-center gap-4 hover:bg-[#F8F9FB] transition-colors"
                      style={!isLast ? { borderBottom: '1px solid #F2F4F6' } : undefined}
                    >
                      <div className="w-9 h-9 bg-[#EBF3FF] rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-toss-blue">{s.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#191919] text-sm">{s.name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            s.role === 'dirty'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-[#EBF3FF] text-toss-blue'
                          }`}>
                            {s.role === 'dirty' ? '더티' : '하우스키핑'}
                          </span>
                        </div>
                        <p className="text-xs text-[#B0B8C1] mt-0.5">{s.phone_number ?? '연락처 없음'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => handleShowQR(s)}
                          className="text-sm font-bold text-toss-blue hover:text-toss-blue-hover transition-colors"
                        >QR 발급</button>
                        <button
                          onClick={() => { setDeleteTarget(s); setDeleteError('') }}
                          className="text-sm text-[#B0B8C1] hover:text-toss-error transition-colors"
                        >삭제</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 일일 근무자 코드 */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-[#191919]">일일 근무자 접속 코드</h2>
              <p className="text-xs text-[#B0B8C1] mt-0.5">당일 자정 만료 · 카카오톡 또는 문자로 전달</p>
            </div>
            {guestCode && (
              <button
                onClick={handleGuestCode}
                className="text-xs font-semibold text-[#6B7684] hover:text-toss-blue transition-colors"
              >재발급</button>
            )}
          </div>

          {guestCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold tracking-[0.15em] text-[#191919] font-mono">{guestCode.code}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(guestCode.code)}
                  className="px-3.5 py-2 bg-[#F2F4F6] hover:bg-[#E8EAED] rounded-xl text-xs font-semibold text-[#6B7684] transition-colors"
                >복사</button>
              </div>
              <div className="flex items-center gap-2 bg-[#F2F4F6] rounded-xl px-4 py-3">
                <span className="text-xs text-[#6B7684] truncate flex-1 font-medium">{guestUrl}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(guestUrl)}
                  className="text-xs text-toss-blue font-bold shrink-0 hover:text-toss-blue-hover transition-colors"
                >URL 복사</button>
              </div>
              <p className="text-xs text-[#B0B8C1]">만료: {new Date(guestCode.expiresAt).toLocaleString('ko-KR')}</p>
            </div>
          ) : (
            <button
              onClick={handleGuestCode}
              disabled={guestLoading}
              className="px-5 py-3 bg-[#191919] hover:bg-[#333] text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
            >
              {guestLoading ? '발급 중...' : '오늘의 코드 발급'}
            </button>
          )}
        </div>
      </main>

      {/* 직원 추가 바텀시트 */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm shadow-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-[#E8EAED] rounded-full" />
            </div>
            <div className="px-6 pt-5 pb-8">
              <h2 className="text-lg font-bold text-[#191919] mb-6">직원 추가</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#191919] mb-2">이름</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="홍길동"
                    autoFocus
                    className="w-full px-4 py-3.5 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] placeholder:text-[#B0B8C1] focus:outline-none focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#191919] mb-2">
                    연락처 <span className="text-[#B0B8C1] font-normal">(선택)</span>
                  </label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="w-full px-4 py-3.5 bg-[#F2F4F6] rounded-xl text-sm text-[#191919] placeholder:text-[#B0B8C1] focus:outline-none focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#191919] mb-2">역할</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'housekeeping', label: '하우스키핑', desc: '배정된 객실 청소' },
                      { value: 'dirty', label: '더티', desc: '전체 객실 더티 처리' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                        className={`px-4 py-3 rounded-xl text-left border-2 transition-all ${
                          form.role === opt.value
                            ? 'border-toss-blue bg-[#EBF3FF]'
                            : 'border-transparent bg-[#F2F4F6] hover:bg-[#E8EAED]'
                        }`}
                      >
                        <p className={`text-sm font-bold ${form.role === opt.value ? 'text-toss-blue' : 'text-[#191919]'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-[#B0B8C1] mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {addError && (
                <div className="mt-3 px-4 py-3 bg-[#FFF0F0] rounded-xl">
                  <p className="text-xs text-toss-error font-medium">{addError}</p>
                </div>
              )}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3.5 bg-[#F2F4F6] hover:bg-[#E8EAED] rounded-xl text-sm font-bold text-[#191919] transition-colors"
                >취소</button>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 py-3.5 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
                >
                  {saving ? '저장 중...' : '저장 후 QR 발급'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR 모달 */}
      {qrModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20"
          onClick={() => setQrModal(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xs shadow-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-[#E8EAED] rounded-full" />
            </div>
            <div className="px-6 pt-5 pb-8 text-center">
              <h2 className="font-bold text-[#191919] text-lg mb-1">{qrModal.name}</h2>
              <p className="text-sm text-[#B0B8C1] mb-5">QR을 스캔하면 바로 업무 화면으로 접속됩니다</p>
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR" className="mx-auto rounded-2xl mb-4" width={200} height={200} />
                : <div className="w-[200px] h-[200px] mx-auto bg-[#F2F4F6] rounded-2xl mb-4 animate-pulse" />
              }
              <button
                onClick={handleRegenerateQR}
                className="text-xs text-amber-500 hover:text-amber-600 font-bold mb-5 block mx-auto transition-colors"
              >
                QR 재발급 (기존 QR 무효화)
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setQrModal(null)}
                  className="flex-1 py-3.5 bg-[#F2F4F6] hover:bg-[#E8EAED] rounded-xl text-sm font-bold text-[#191919] transition-colors"
                >닫기</button>
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`${qrModal.name}_QR.png`}
                    className="flex-1 py-3.5 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl text-sm font-bold text-center transition-colors"
                  >다운로드</a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xs shadow-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-[#E8EAED] rounded-full" />
            </div>
            <div className="px-6 pt-5 pb-8 text-center">
              <div className="w-12 h-12 bg-[#FFF0F0] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="#F04452" className="w-6 h-6">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="font-bold text-[#191919] text-base mb-1">{deleteTarget.name} 직원을 삭제할까요?</p>
              {deleteError
                ? <p className="text-sm text-amber-500 font-medium mb-5">{deleteError}</p>
                : <p className="text-sm text-[#B0B8C1] mb-5">QR이 즉시 무효화됩니다</p>
              }
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3.5 bg-[#F2F4F6] hover:bg-[#E8EAED] rounded-xl text-sm font-bold text-[#191919] transition-colors"
                >취소</button>
                <button
                  onClick={() => handleDelete(!!deleteError)}
                  disabled={deleting}
                  className="flex-1 py-3.5 bg-toss-error hover:bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
                >
                  {deleteError ? '그래도 삭제' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
