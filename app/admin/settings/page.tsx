'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

type ApiKey = {
  id: string
  label: string
  created_at: string
  last_used_at: string | null
}

type WebhookInfo = {
  hasSec: boolean
  masked: string | null
}

const WEBHOOK_URL = 'https://roomly-plum-eight.vercel.app/api/pms/webhook'

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

const ALERT_MINUTE_OPTIONS = [30, 60, 90, 120, 180, 240]

export default function SettingsPage() {
  const router = useRouter()
  const [hotelId, setHotelId] = useState('')
  const [loading, setLoading] = useState(true)

  // 일반 설정 (T-058)
  const [hotelName, setHotelName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [alertMinutes, setAlertMinutes] = useState(120)
  const [generalSaving, setGeneralSaving] = useState(false)
  const [generalMsg, setGeneralMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // 비밀번호 변경
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // API 키 상태
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [issuedKey, setIssuedKey] = useState<string | null>(null)
  const [keyIssuing, setKeyIssuing] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  // 웹훅 상태
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo>({ hasSec: false, masked: null })
  const [issuedSecret, setIssuedSecret] = useState<string | null>(null)
  const [secretIssuing, setSecretIssuing] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const loadApiKeys = useCallback(async () => {
    const res = await fetch('/api/admin/api-keys')
    if (res.ok) {
      const data = await res.json() as ApiKey[]
      setApiKeys(data)
    }
  }, [])

  const loadWebhookInfo = useCallback(async () => {
    const res = await fetch('/api/admin/webhook-secret')
    if (res.ok) {
      const data = await res.json() as WebhookInfo
      setWebhookInfo(data)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/admin/settings')
    if (res.ok) {
      const data = await res.json() as { hotelName: string; email: string; checkinAlertMinutes: number }
      setHotelName(data.hotelName ?? '')
      setAdminEmail(data.email ?? '')
      setAlertMinutes(data.checkinAlertMinutes ?? 120)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setHotelId(user.app_metadata?.hotel_id as string)
      await Promise.all([loadSettings(), loadApiKeys(), loadWebhookInfo()])
      setLoading(false)
    }
    init()
  }, [router, loadSettings, loadApiKeys, loadWebhookInfo])

  async function handleSaveGeneral() {
    if (!hotelName.trim()) {
      setGeneralMsg({ text: '호텔명을 입력해주세요.', ok: false })
      return
    }
    setGeneralSaving(true)
    setGeneralMsg(null)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelName: hotelName.trim(), checkinAlertMinutes: alertMinutes }),
    })
    if (res.ok) {
      setGeneralMsg({ text: '저장되었습니다.', ok: true })
    } else {
      setGeneralMsg({ text: '저장에 실패했습니다. 다시 시도해주세요.', ok: false })
    }
    setGeneralSaving(false)
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      setPasswordMsg({ text: '비밀번호는 8자 이상이어야 합니다.', ok: false })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: '비밀번호가 일치하지 않습니다.', ok: false })
      return
    }
    setPasswordSaving(true)
    setPasswordMsg(null)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    if (res.ok) {
      setPasswordMsg({ text: '비밀번호가 변경되었습니다.', ok: true })
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setPasswordMsg({ text: '비밀번호 변경에 실패했습니다.', ok: false })
    }
    setPasswordSaving(false)
  }

  async function handleIssueKey() {
    if (!newKeyLabel.trim()) return
    setKeyIssuing(true)
    const res = await fetch('/api/admin/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newKeyLabel.trim() }),
    })
    if (res.ok) {
      const data = await res.json() as { id: string; key: string }
      setIssuedKey(data.key)
      setNewKeyLabel('')
      await loadApiKeys()
    }
    setKeyIssuing(false)
  }

  async function handleDeleteKey(id: string) {
    if (!confirm('이 API 키를 삭제하시겠습니까? 이 키를 사용하는 연동은 즉시 중단됩니다.')) return
    await fetch('/api/admin/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadApiKeys()
  }

  async function handleIssueSecret() {
    if (webhookInfo.hasSec && !confirm('기존 시크릿이 무효화됩니다. 재발급하시겠습니까?')) return
    setSecretIssuing(true)
    const res = await fetch('/api/admin/webhook-secret', { method: 'POST' })
    if (res.ok) {
      const data = await res.json() as { secret: string }
      setIssuedSecret(data.secret)
      await loadWebhookInfo()
    }
    setSecretIssuing(false)
  }

  function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function closeKeyModal() {
    setShowKeyModal(false)
    setIssuedKey(null)
    setNewKeyLabel('')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-16 md:pb-6 space-y-6">
        <h1 className="text-lg font-bold text-slate-900">설정</h1>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">불러오는 중...</div>
        ) : (
          <>
            {/* 섹션 0: 일반 설정 (T-058) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">일반 설정</h2>
                <p className="text-xs text-slate-400 mt-0.5">호텔 기본 정보와 체크인 긴급 알림 기준을 설정합니다.</p>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">호텔명</label>
                  <input
                    type="text"
                    value={hotelName}
                    onChange={e => setHotelName(e.target.value)}
                    maxLength={100}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">관리자 이메일</label>
                  <input
                    type="email"
                    value={adminEmail}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">체크인 긴급 알림 기준</label>
                  <select
                    value={alertMinutes}
                    onChange={e => setAlertMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {ALERT_MINUTE_OPTIONS.map(m => (
                      <option key={m} value={m}>
                        체크인 {m >= 60 ? `${m / 60}시간` : `${m}분`} 전
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1.5">체크인이 이 시간 안으로 다가온 미완료 객실을 현황판에서 강조하고 푸시 알림을 발송합니다.</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  {generalMsg
                    ? <p className={`text-xs ${generalMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{generalMsg.text}</p>
                    : <span />}
                  <button
                    onClick={handleSaveGeneral}
                    disabled={generalSaving}
                    className="shrink-0 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {generalSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>

            {/* 섹션 0-1: 비밀번호 변경 (T-058) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">비밀번호 변경</h2>
                <p className="text-xs text-slate-400 mt-0.5">관리자 계정 로그인 비밀번호를 변경합니다.</p>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">새 비밀번호 (8자 이상)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  {passwordMsg
                    ? <p className={`text-xs ${passwordMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{passwordMsg.text}</p>
                    : <span />}
                  <button
                    onClick={handleChangePassword}
                    disabled={passwordSaving || !newPassword || !confirmPassword}
                    className="shrink-0 px-4 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    {passwordSaving ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>
              </div>
            </div>

            {/* 섹션 1: API 키 관리 */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">공개 API 키</h2>
                  <p className="text-xs text-slate-400 mt-0.5">외부 시스템에서 Roomly REST API에 접근할 때 사용합니다.</p>
                </div>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  키 발급
                </button>
              </div>

              {apiKeys.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">발급된 API 키가 없습니다.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {apiKeys.map(key => (
                    <div key={key.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{key.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          발급: {formatDate(key.created_at)}
                          {key.last_used_at && <span className="ml-2">마지막 사용: {formatDate(key.last_used_at)}</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="shrink-0 px-2.5 py-1 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 섹션 2: PMS 웹훅 연동 */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">PMS 웹훅 연동</h2>
                <p className="text-xs text-slate-400 mt-0.5">PMS에서 체크아웃/체크인 이벤트를 Roomly로 전송합니다.</p>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* 웹훅 URL */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">웹훅 URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 truncate">
                      {WEBHOOK_URL}
                    </code>
                    <button
                      onClick={() => copyToClipboard(WEBHOOK_URL, setCopiedUrl)}
                      className="shrink-0 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {copiedUrl ? '복사됨' : '복사'}
                    </button>
                  </div>
                </div>

                {/* 웹훅 시크릿 */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">웹훅 시크릿</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-500">
                      {webhookInfo.hasSec
                        ? <span className="font-mono">{webhookInfo.masked}</span>
                        : <span className="text-slate-400">발급된 시크릿 없음</span>
                      }
                    </div>
                    <button
                      onClick={handleIssueSecret}
                      disabled={secretIssuing}
                      className="shrink-0 px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      {secretIssuing ? '발급 중...' : webhookInfo.hasSec ? '재발급' : '발급'}
                    </button>
                  </div>

                  {/* 새로 발급된 시크릿 표시 */}
                  {issuedSecret && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-700 font-medium mb-1.5">시크릿이 발급되었습니다. 지금 복사하세요 — 다시 확인할 수 없습니다.</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 break-all">
                          {issuedSecret}
                        </code>
                        <button
                          onClick={() => copyToClipboard(issuedSecret, setCopiedSecret)}
                          className="shrink-0 px-2.5 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          {copiedSecret ? '복사됨' : '복사'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 필요 헤더 안내 */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">필수 요청 헤더</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-1.5">
                    <div className="flex items-start gap-2 text-xs">
                      <code className="text-slate-500 shrink-0">X-Hotel-Id:</code>
                      <code className="text-slate-700 break-all">{hotelId || '<hotel_id>'}</code>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <code className="text-slate-500 shrink-0">X-Roomly-Webhook-Secret:</code>
                      <code className="text-slate-700">&lt;secret&gt;</code>
                    </div>
                  </div>
                </div>

                {/* 이벤트 페이로드 안내 */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">이벤트 페이로드 예시</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-3">
                    <div>
                      <p className="text-[11px] text-slate-400 mb-1">체크아웃 (객실 → dirty 전환)</p>
                      <pre className="text-xs text-slate-700 font-mono">{`{ "event": "checkout", "room_number": "101" }`}</pre>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 mb-1">체크인 시간 업데이트</p>
                      <pre className="text-xs text-slate-700 font-mono">{`{ "event": "checkin_updated", "room_number": "101", "checkin_time": "2026-06-23T14:00:00Z" }`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* API 키 발급 모달 */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            {!issuedKey ? (
              <>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">API 키 발급</h3>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">레이블 (용도 식별용)</label>
                <input
                  type="text"
                  value={newKeyLabel}
                  onChange={e => setNewKeyLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleIssueKey()}
                  placeholder="예: PMS 연동, 외부 대시보드"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={closeKeyModal}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleIssueKey}
                    disabled={keyIssuing || !newKeyLabel.trim()}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {keyIssuing ? '발급 중...' : '발급'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">API 키가 발급되었습니다</h3>
                <p className="text-xs text-slate-500 mb-4">지금 복사하세요 — 다시 확인할 수 없습니다.</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
                  <code className="text-xs font-mono text-slate-800 break-all">{issuedKey}</code>
                </div>
                <button
                  onClick={() => copyToClipboard(issuedKey, setCopiedKey)}
                  className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-2"
                >
                  {copiedKey ? '복사됨!' : '클립보드에 복사'}
                </button>
                <button
                  onClick={closeKeyModal}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
