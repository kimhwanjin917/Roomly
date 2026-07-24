'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeRefetch } from '@/lib/hooks/useLive'
import QRCode from 'qrcode'
import { C } from '@/lib/theme'
import { appUrl } from '@/lib/constants'

type Staff = { id: string; name: string; phone_number: string | null; qr_version: number; role: string; employment_type: string }
type GuestCode = { id: string; code: string; expiresAt: string }

const inputSt: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 10, fontSize: 13, color: C.text,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20,
}
const modalBox: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`,
  width: '100%', maxWidth: 420,
  borderRadius: '20px 20px 0 0',
  boxShadow: '0 -24px 80px rgba(0,0,0,0.6)',
  overflow: 'hidden',
}

function ModalHandle() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }} className="sm:hidden">
      <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999 }}/>
    </div>
  )
}

export default function StaffClient({ hotelId, initialStaffList }: { hotelId: string; initialStaffList: Staff[] }) {
  const [staffList, setStaffList]     = useState<Staff[]>(initialStaffList)

  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm]               = useState({ name: '', phone: '', role: 'housekeeping' })
  const [saving, setSaving]           = useState(false)
  const [addError, setAddError]       = useState('')

  const [qrModal, setQrModal]         = useState<{ name: string; qrUrl: string; staffId: string } | null>(null)
  const [qrDataUrl, setQrDataUrl]     = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)
  const [deleteError, setDeleteError]   = useState('')
  const [deleting, setDeleting]         = useState(false)

  const [guestCode, setGuestCode]     = useState<GuestCode | null>(null)
  const [guestLoading, setGuestLoading] = useState(false)
  const [guestQrDataUrl, setGuestQrDataUrl] = useState('')
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  const refreshList = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('staff').select('*').eq('hotel_id', hotelId).order('name')
    setStaffList(data ?? [])
  }, [hotelId])

  useEffect(() => {
    fetch('/api/admin/guest-code').then(r => r.json()).then(data => { if (data) setGuestCode(data) })
  }, [])

  useRealtimeRefetch({ channel: 'staff-list', tables: ['staff'], onChange: refreshList })

  // 실시간 구독이 누락될 경우를 대비한 폴링 백업 (10초)
  useEffect(() => {
    const t = setInterval(refreshList, 10_000)
    return () => clearInterval(t)
  }, [refreshList])

  useEffect(() => {
    if (!qrModal?.qrUrl) { setQrDataUrl(''); return }
    QRCode.toDataURL(qrModal.qrUrl, { width: 240, margin: 2 }).then(setQrDataUrl)
  }, [qrModal?.qrUrl])

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
    setShowRegenConfirm(false)
    setGuestLoading(false)
    await refreshList()
  }

  const guestUrl = `${appUrl()}/guest?h=${hotelId}`
  const guestQrUrl = guestCode ? `${guestUrl}&c=${guestCode.code}` : ''

  useEffect(() => {
    if (!guestQrUrl) { setGuestQrDataUrl(''); return }
    QRCode.toDataURL(guestQrUrl, { width: 180, margin: 2 }).then(setGuestQrDataUrl)
  }, [guestQrUrl])

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-enter { animation: fadeUp 0.18s ease-out both; }
      `}</style>

      <main className="page-enter md:pb-6" style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* 직원 목록 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>직원 관리</h1>
              <p style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>{staffList.length}명 등록됨</p>
            </div>
            <button
              onClick={() => { setForm({ name: '', phone: '', role: 'housekeeping' }); setAddError(''); setShowAddModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 0 18px ${C.accent}44` }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              직원 추가
            </button>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {staffList.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, background: C.surface, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth={1.5} style={{ width: 22, height: 22 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                </div>
                <p style={{ color: C.text, fontWeight: 700, marginBottom: 4 }}>등록된 직원이 없습니다</p>
                <p style={{ fontSize: 13, color: C.textDim }}>직원을 추가하면 QR로 접속할 수 있습니다</p>
              </div>
            ) : (
              <div>
                {staffList.map((s, idx) => {
                  const isLast = idx === staffList.length - 1
                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '' }}
                    >
                      <div style={{ width: 36, height: 36, background: `${C.accent}18`, border: `1px solid ${C.accent}25`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{s.name.charAt(0)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{s.name}</p>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                            background: s.role === 'dirty' ? 'rgba(251,191,36,0.1)' : `${C.accent}14`,
                            color: s.role === 'dirty' ? C.amber : C.accent,
                            border: `1px solid ${s.role === 'dirty' ? 'rgba(251,191,36,0.2)' : C.accent + '28'}`,
                          }}>
                            {s.role === 'dirty' ? '더티' : '하우스키핑'}
                          </span>
                          {s.employment_type === 'temp' && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                              background: 'rgba(148,163,184,0.12)', color: C.textMid,
                              border: '1px solid rgba(148,163,184,0.22)',
                            }}>
                              일용직
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{s.phone_number ?? '연락처 없음'}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                        <button
                          onClick={() => handleShowQR(s)}
                          style={{ fontSize: 12, fontWeight: 700, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >QR 발급</button>
                        <button
                          onClick={() => { setDeleteTarget(s); setDeleteError('') }}
                          style={{ fontSize: 12, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
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
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>일일 근무자 접속 코드</h2>
              <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>당일 자정 만료 · QR 스캔 또는 링크/문자로 전달</p>
            </div>
            {guestCode && (
              <button
                onClick={() => setShowRegenConfirm(true)}
                style={{ fontSize: 11, fontWeight: 600, color: C.textMid, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >재발급</button>
            )}
          </div>

          {guestCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {guestQrDataUrl && (
                  <img src={guestQrDataUrl} alt="일일 근무자 접속 QR" style={{ width: 96, height: 96, borderRadius: 8, background: '#fff', padding: 6, flexShrink: 0 }}/>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '0.18em', color: C.text, fontFamily: 'monospace' }}>{guestCode.code}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(guestCode.code)}
                    style={{ padding: '7px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, fontWeight: 600, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}
                  >복사</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
                <span style={{ fontSize: 11, color: C.textDim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guestUrl}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(guestUrl)}
                  style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
                >URL 복사</button>
              </div>
              <p style={{ fontSize: 11, color: C.textDim }}>만료: {new Date(guestCode.expiresAt).toLocaleString('ko-KR')}</p>
            </div>
          ) : (
            <button
              onClick={handleGuestCode}
              disabled={guestLoading}
              style={{ padding: '10px 20px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.text, cursor: guestLoading ? 'not-allowed' : 'pointer', opacity: guestLoading ? 0.5 : 1, fontFamily: 'inherit' }}
            >
              {guestLoading ? '발급 중...' : '오늘의 코드 발급'}
            </button>
          )}
        </div>
      </main>

      {/* 직원 추가 모달 */}
      {showAddModal && (
        <div style={modalOverlay} className="sm:items-center" onClick={() => setShowAddModal(false)}>
          <div style={modalBox} className="sm:rounded-2xl sm:max-w-sm" onClick={e => e.stopPropagation()}>
            <ModalHandle/>
            <div style={{ padding: '16px 20px 24px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 20 }}>직원 추가</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>이름</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="홍길동"
                    autoFocus
                    style={inputSt}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.accent }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    연락처 <span style={{ color: C.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(선택)</span>
                  </label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    style={inputSt}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.accent }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>역할</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { value: 'housekeeping', label: '하우스키핑', desc: '배정된 객실 청소' },
                      { value: 'dirty', label: '더티', desc: '전체 객실 더티 처리' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                        style={{
                          padding: '12px', borderRadius: 10, textAlign: 'left',
                          border: `2px solid ${form.role === opt.value ? C.accent : C.border}`,
                          background: form.role === opt.value ? `${C.accent}10` : C.card,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        }}
                      >
                        <p style={{ fontSize: 13, fontWeight: 700, color: form.role === opt.value ? C.accent : C.text }}>{opt.label}</p>
                        <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {addError && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(248,113,113,0.07)', border: `1px solid rgba(248,113,113,0.16)`, borderRadius: 10 }}>
                  <p style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{addError}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '13px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}
                >취소</button>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  style={{ flex: 1, padding: '13px 0', background: C.accent, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'inherit' }}
                >{saving ? '저장 중...' : '저장 후 QR 발급'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR 모달 */}
      {qrModal && (
        <div style={modalOverlay} className="sm:items-center" onClick={() => setQrModal(null)}>
          <div style={{ ...modalBox, maxWidth: 360 }} className="sm:rounded-2xl sm:max-w-xs" onClick={e => e.stopPropagation()}>
            <ModalHandle/>
            <div style={{ padding: '16px 20px 24px', textAlign: 'center' }}>
              <h2 style={{ fontWeight: 700, color: C.text, fontSize: 16, marginBottom: 4 }}>{qrModal.name}</h2>
              <p style={{ fontSize: 12, color: C.textDim, marginBottom: 18 }}>QR을 스캔하면 바로 업무 화면으로 접속됩니다</p>
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR" style={{ margin: '0 auto 14px', borderRadius: 12, display: 'block' }} width={200} height={200} />
                : <div style={{ width: 200, height: 200, margin: '0 auto 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, animation: 'pulse 1.5s ease infinite' }}/>
              }
              <button
                onClick={handleRegenerateQR}
                style={{ fontSize: 11, color: C.amber, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'block', margin: '0 auto 18px', fontFamily: 'inherit' }}
              >QR 재발급 (기존 QR 무효화)</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setQrModal(null)}
                  style={{ flex: 1, padding: '13px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}
                >닫기</button>
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`${qrModal.name}_QR.png`}
                    style={{ flex: 1, padding: '13px 0', background: C.accent, borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'block', textAlign: 'center' }}
                  >다운로드</a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div style={modalOverlay} className="sm:items-center" onClick={() => setDeleteTarget(null)}>
          <div style={{ ...modalBox, maxWidth: 360 }} className="sm:rounded-2xl sm:max-w-xs" onClick={e => e.stopPropagation()}>
            <ModalHandle/>
            <div style={{ padding: '16px 20px 24px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: 'rgba(248,113,113,0.1)', border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg viewBox="0 0 24 24" fill={C.red} style={{ width: 22, height: 22 }}>
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
              <p style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>{deleteTarget.name} 직원을 삭제할까요?</p>
              {deleteError
                ? <p style={{ fontSize: 13, color: C.amber, fontWeight: 600, marginBottom: 18 }}>{deleteError}</p>
                : <p style={{ fontSize: 13, color: C.textDim, marginBottom: 18 }}>QR이 즉시 무효화됩니다</p>
              }
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{ flex: 1, padding: '13px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}
                >취소</button>
                <button
                  onClick={() => handleDelete(!!deleteError)}
                  disabled={deleting}
                  style={{ flex: 1, padding: '13px 0', background: C.red, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1, fontFamily: 'inherit' }}
                >{deleteError ? '그래도 삭제' : '삭제'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 코드 재발급 확인 */}
      {showRegenConfirm && (
        <div style={modalOverlay} className="sm:items-center" onClick={() => setShowRegenConfirm(false)}>
          <div style={{ ...modalBox, maxWidth: 360 }} className="sm:rounded-2xl sm:max-w-xs" onClick={e => e.stopPropagation()}>
            <ModalHandle/>
            <div style={{ padding: '16px 20px 24px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth={2} style={{ width: 22, height: 22 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <p style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 6 }}>접속 코드를 재발급할까요?</p>
              <p style={{ fontSize: 13, color: C.textDim, marginBottom: 18, lineHeight: 1.5 }}>
                기존 코드와 QR이 즉시 무효화되고, 현재 등록된 <b style={{ color: C.textMid }}>일용직 {staffList.filter(s => s.employment_type === 'temp').length}명</b>의 기록이 모두 삭제됩니다.
                근무자는 새 QR로 처음부터 다시 등록해야 합니다. (청소 배정과 작업 이력은 유지됩니다)
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowRegenConfirm(false)}
                  style={{ flex: 1, padding: '13px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.textMid, cursor: 'pointer', fontFamily: 'inherit' }}
                >취소</button>
                <button
                  onClick={handleGuestCode}
                  disabled={guestLoading}
                  style={{ flex: 1, padding: '13px 0', background: C.amber, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#111', cursor: guestLoading ? 'not-allowed' : 'pointer', opacity: guestLoading ? 0.5 : 1, fontFamily: 'inherit' }}
                >{guestLoading ? '발급 중...' : '재발급'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
