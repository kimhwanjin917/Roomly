'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'roomly_onboarding_v1'

interface Props {
  roomCount: number
  staffCount: number
  hasAssignment: boolean
}

export default function OnboardingChecklist({ roomCount, staffCount, hasAssignment }: Props) {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [qrShared, setQrShared] = useState(false)
  const [everAssigned, setEverAssigned] = useState(false)

  useEffect(() => {
    setMounted(true)
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved = raw ? JSON.parse(raw) : {}
    setDismissed(saved.dismissed ?? false)
    setQrShared(saved.qrShared ?? false)
    setEverAssigned(saved.everAssigned ?? false)
  }, [])

  useEffect(() => {
    if (!mounted || everAssigned) return
    if (hasAssignment) {
      setEverAssigned(true)
      patch({ everAssigned: true })
    }
  }, [hasAssignment, mounted, everAssigned])

  function patch(data: Record<string, boolean>) {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved = raw ? JSON.parse(raw) : {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, ...data }))
  }

  function handleQrShared() {
    setQrShared(true)
    patch({ qrShared: true })
  }

  function handleDismiss() {
    setDismissed(true)
    patch({ dismissed: true })
  }

  if (!mounted || dismissed) return null

  const steps = [
    {
      id: 'rooms',
      label: '첫 객실 등록',
      desc: '현황판에서 관리할 객실을 추가하세요',
      done: roomCount > 0,
      action: (
        <Link href="/admin/rooms" className="text-xs font-bold text-[#3182F6] hover:underline whitespace-nowrap">
          등록하기 →
        </Link>
      ),
    },
    {
      id: 'staff',
      label: '직원 추가',
      desc: '하우스키핑 직원을 등록하세요',
      done: staffCount > 0,
      action: (
        <Link href="/admin/staff" className="text-xs font-bold text-[#3182F6] hover:underline whitespace-nowrap">
          추가하기 →
        </Link>
      ),
    },
    {
      id: 'qr',
      label: 'QR 코드 직원 공유',
      desc: '직원 페이지에서 QR을 출력해 직원에게 전달하세요',
      done: qrShared,
      action: (
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin/staff" className="text-xs font-bold text-[#3182F6] hover:underline whitespace-nowrap">
            QR 보기 →
          </Link>
          <button
            onClick={handleQrShared}
            className="text-xs text-[#B0B8C1] hover:text-[#6B7684] font-medium transition-colors whitespace-nowrap"
          >
            공유 완료
          </button>
        </div>
      ),
    },
    {
      id: 'assign',
      label: '첫 배정 완료',
      desc: '객실 카드를 눌러 직원에게 배정하세요',
      done: everAssigned || hasAssignment,
      action: (
        <span className="text-xs text-[#B0B8C1] whitespace-nowrap">배정 후 자동 완료</span>
      ),
    },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  if (allDone) return null

  const progressPct = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="bg-white rounded-2xl shadow-card mb-5 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between" style={{ borderBottom: '1px solid #F2F4F6' }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-[#191919]">시작 가이드</h3>
            <span className="text-[10px] font-bold bg-[#EBF3FF] text-[#3182F6] px-2 py-0.5 rounded-full">
              {completedCount}/{steps.length}
            </span>
          </div>
          <p className="text-xs text-[#B0B8C1]">모두 완료하면 자동으로 사라집니다</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#B0B8C1] hover:text-[#6B7684] transition-colors p-0.5 mt-0.5"
          aria-label="숨기기"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {/* 프로그레스바 */}
      <div className="h-1 bg-[#F2F4F6]">
        <div
          className="h-1 bg-[#3182F6] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 스텝 목록 */}
      <div className="divide-y divide-[#F2F4F6]">
        {steps.map(step => (
          <div
            key={step.id}
            className={`px-5 py-3.5 flex items-center gap-3.5 transition-opacity ${step.done ? 'opacity-40' : ''}`}
          >
            {/* 체크 아이콘 */}
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
              step.done ? 'bg-[#05C072]' : 'border-2 border-[#E8EAED]'
            }`}>
              {step.done && (
                <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* 텍스트 */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-tight ${step.done ? 'line-through text-[#B0B8C1]' : 'text-[#191919]'}`}>
                {step.label}
              </p>
              {!step.done && (
                <p className="text-xs text-[#B0B8C1] mt-0.5 leading-tight">{step.desc}</p>
              )}
            </div>

            {/* 액션 */}
            {!step.done && (
              <div className="shrink-0">{step.action}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
