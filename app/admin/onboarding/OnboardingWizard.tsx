'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type AddedRoom = { id: string; number: string; floor: number; type: string }
type AddedStaff = { id: string; name: string }

const TYPE_LABELS: Record<string, string> = {
  single: '싱글', double: '더블', suite: '스위트', other: '기타',
}

interface Props {
  hotelId: string
  hotelName: string
}

export default function OnboardingWizard({ hotelId, hotelName }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1: 객실
  const [roomForm, setRoomForm] = useState({ number: '', floor: '', type: 'double' })
  const [addedRooms, setAddedRooms] = useState<AddedRoom[]>([])
  const [roomSaving, setRoomSaving] = useState(false)
  const [roomError, setRoomError] = useState('')

  // Step 2: 직원
  const [staffForm, setStaffForm] = useState({ name: '', phone: '' })
  const [addedStaff, setAddedStaff] = useState<AddedStaff[]>([])
  const [staffSaving, setStaffSaving] = useState(false)
  const [staffError, setStaffError] = useState('')

  async function handleAddRoom() {
    if (!roomForm.number.trim() || !roomForm.floor) { setRoomError('호수와 층을 입력해 주세요.'); return }
    setRoomSaving(true); setRoomError('')
    const res = await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: roomForm.number.trim(), floor: Number(roomForm.floor), type: roomForm.type }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (res.status === 409) { setRoomError('이미 존재하는 호수입니다.'); setRoomSaving(false); return }
      setRoomError(`저장 실패 (${res.status}: ${data.detail ?? data.error ?? ''})`)
      setRoomSaving(false); return
    }
    setAddedRooms(r => [...r, data])
    setRoomForm({ number: '', floor: roomForm.floor, type: roomForm.type })
    setRoomSaving(false)
  }

  async function handleAddStaff() {
    if (!staffForm.name.trim()) { setStaffError('이름을 입력해 주세요.'); return }
    setStaffSaving(true); setStaffError('')
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: staffForm.name.trim(), phone_number: staffForm.phone.trim() || null }),
    })
    const data = await res.json()
    if (!res.ok) { setStaffError('저장 실패'); setStaffSaving(false); return }
    setAddedStaff(s => [...s, { id: data.staffId, name: staffForm.name.trim() }])
    setStaffForm({ name: '', phone: '' })
    setStaffSaving(false)
  }

  function handleFinish() {
    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-4 pt-16 pb-20">
      {/* 로고 */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <span className="font-semibold text-slate-800">{hotelName}</span>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>1</div>
        <div className={`h-0.5 w-10 rounded-full transition-colors ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>2</div>
      </div>

      <div className="w-full max-w-md">
        {/* ─── STEP 1: 객실 등록 ─── */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Step 1 of 2</p>
              <h1 className="text-2xl font-bold text-slate-900">객실을 등록해 보세요</h1>
              <p className="text-sm text-slate-500 mt-1.5">나중에 언제든 추가하거나 삭제할 수 있습니다.</p>
            </div>

            {/* 객실 추가 폼 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">호수</label>
                  <input
                    value={roomForm.number}
                    onChange={e => setRoomForm(f => ({ ...f, number: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
                    placeholder="101"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">층</label>
                  <input
                    type="number"
                    value={roomForm.floor}
                    onChange={e => setRoomForm(f => ({ ...f, floor: e.target.value }))}
                    placeholder="1"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">타입</label>
                  <select
                    value={roomForm.type}
                    onChange={e => setRoomForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-2 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="single">싱글</option>
                    <option value="double">더블</option>
                    <option value="suite">스위트</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>
              {roomError && <p className="text-xs text-red-500 mb-2">{roomError}</p>}
              <button
                onClick={handleAddRoom}
                disabled={roomSaving}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-sm text-slate-500 hover:text-blue-600 font-medium disabled:opacity-40 transition-colors"
              >
                {roomSaving ? '추가 중...' : '+ 객실 추가'}
              </button>
            </div>

            {/* 추가된 객실 목록 */}
            {addedRooms.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">추가된 객실</span>
                  <span className="text-xs text-emerald-600 font-semibold">{addedRooms.length}개</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {addedRooms.map(r => (
                    <div key={r.id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{r.number}호</span>
                      <span className="text-xs text-slate-400">{r.floor}층 · {TYPE_LABELS[r.type] ?? r.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={() => setStep(2)}
                disabled={addedRooms.length === 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-40 transition-colors"
              >
                다음 단계 →
              </button>
              {addedRooms.length === 0 && (
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  건너뛰기
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 2: 직원 등록 ─── */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Step 2 of 2</p>
              <h1 className="text-2xl font-bold text-slate-900">직원을 추가해 보세요</h1>
              <p className="text-sm text-slate-500 mt-1.5">추가 후 QR 코드를 발급해 직원에게 전달하세요.</p>
            </div>

            {/* 직원 추가 폼 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">이름</label>
                  <input
                    value={staffForm.name}
                    onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddStaff()}
                    placeholder="홍길동"
                    autoFocus
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">연락처 <span className="text-slate-300 normal-case font-normal">(선택)</span></label>
                  <input
                    value={staffForm.phone}
                    onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {staffError && <p className="text-xs text-red-500 mb-2">{staffError}</p>}
              <button
                onClick={handleAddStaff}
                disabled={staffSaving}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-sm text-slate-500 hover:text-blue-600 font-medium disabled:opacity-40 transition-colors"
              >
                {staffSaving ? '추가 중...' : '+ 직원 추가'}
              </button>
            </div>

            {/* 추가된 직원 목록 */}
            {addedStaff.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">추가된 직원</span>
                  <span className="text-xs text-emerald-600 font-semibold">{addedStaff.length}명</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {addedStaff.map(s => (
                    <div key={s.id} className="px-4 py-2.5 flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-slate-500">{s.name[0]}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={handleFinish}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                {addedStaff.length > 0 ? '대시보드 시작하기 →' : '건너뛰고 시작하기 →'}
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← 이전 단계
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
