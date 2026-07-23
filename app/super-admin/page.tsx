'use client'

import { useState, useEffect, useCallback } from 'react'
import RoomlyMark from '@/components/RoomlyMark'

type Tab = 'hotels' | 'licenses'

interface Stats {
  total: number
  active: number
  paid: number
  expired: number
  mrr: number
  planCounts: Record<string, number>
  signupTrend: { date: string; count: number }[]
}

const PLAN_LABELS: Record<string, string> = {
  trial: '무료 체험',
  starter: '스타터',
  standard: '스탠다드',
  pro: '프로',
}

interface Hotel {
  id: string
  name: string
  subscription_plan: string | null
  created_at: string
  roomCount: number
}

interface License {
  id: string
  key: string
  created_at: string
  used_at: string | null
  hotel_id: string | null
}

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastId = 0

export default function SuperAdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check existing session by hitting a protected endpoint
  useEffect(() => {
    fetch('/api/super-admin/hotels')
      .then(r => {
        if (r.ok) setAuthed(true)
      })
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />
  }

  return <Dashboard />
}

/* ─── Login Screen ─────────────────────────────────────────────────────────── */

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError('비밀번호가 올바르지 않습니다.')
        return
      }
      onSuccess()
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <RoomlyMark size={48} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Roomly</h1>
          <p className="text-sm text-slate-500 mt-1">운영자 전용 관리 콘솔</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              관리자 비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoFocus
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? '인증 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Dashboard ────────────────────────────────────────────────────────────── */

function Dashboard() {
  const [tab, setTab] = useState<Tab>('hotels')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/super-admin/stats')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setStats(data)
    } catch {
      // stats 실패 시 조용히 무시
    } finally {
      setStatsLoading(false)
    }
  }

  function addToast(message: string, type: ToastType = 'success') {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <RoomlyMark size={32} />
        <div>
          <h1 className="text-base font-semibold text-slate-900">Roomly 운영자 콘솔</h1>
          <p className="text-xs text-slate-400">Super Admin Dashboard</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Stats Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">수익 현황</h2>
            <button
              onClick={fetchStats}
              disabled={statsLoading}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium disabled:opacity-40 transition-colors"
            >
              새로고침
            </button>
          </div>
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                  <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
                  <div className="h-7 bg-slate-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-blue-200 p-4">
                  <p className="text-xs font-medium text-blue-600 mb-1">MRR</p>
                  <p className="text-2xl font-bold text-blue-700 tabular-nums">
                    ₩{stats.mrr.toLocaleString('ko-KR')}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">최근 30일 결제 합계</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500 mb-1">전체 호텔</p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats.total}</p>
                </div>
                <div className="bg-white rounded-xl border border-emerald-200 p-4">
                  <p className="text-xs font-medium text-emerald-600 mb-1">활성</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums">{stats.active}</p>
                  <p className="text-xs text-slate-400 mt-1">plan_expires_at &gt; now</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500 mb-1">만료</p>
                  <p className="text-2xl font-bold text-slate-600 tabular-nums">{stats.expired}</p>
                  <p className="text-xs text-slate-400 mt-1">무료체험 포함</p>
                </div>
              </div>

              {/* 플랜별 호텔 수 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['trial', 'starter', 'standard', 'pro'] as const).map(plan => (
                  <div key={plan} className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500 mb-1">{PLAN_LABELS[plan]}</p>
                    <p className="text-xl font-bold text-slate-900 tabular-nums">
                      {stats.planCounts?.[plan] ?? 0}
                      <span className="text-xs font-normal text-slate-400 ml-1">개 호텔</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* 최근 30일 가입 추이 */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 mb-2">최근 30일 신규 가입</p>
                <SignupTrendChart data={stats.signupTrend ?? []} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
          {(['hotels', 'licenses'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'hotels' ? '호텔 목록' : '라이선스'}
            </button>
          ))}
        </div>

        {tab === 'hotels' ? (
          <HotelsTab addToast={addToast} />
        ) : (
          <LicensesTab addToast={addToast} />
        )}
      </div>

      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
              t.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Signup Trend Chart (T-061) ───────────────────────────────────────────── */

function SignupTrendChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-slate-400 py-4 text-center">데이터가 없습니다.</p>
  }
  const maxVal = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-0.5 h-24">
      {data.map(d => (
        <div
          key={d.date}
          className="flex-1 flex flex-col justify-end h-full"
          title={`${d.date.slice(5).replace('-', '/')} — ${d.count}건`}
        >
          <div
            className={`w-full rounded-t transition-all ${d.count > 0 ? 'bg-blue-500' : 'bg-slate-100'}`}
            style={{ height: `${Math.max((d.count / maxVal) * 100, 4)}%` }}
          />
        </div>
      ))}
    </div>
  )
}

/* ─── Hotels Tab ───────────────────────────────────────────────────────────── */

function HotelsTab({ addToast }: { addToast: (msg: string, type?: ToastType) => void }) {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/hotels')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setHotels(data.hotels)
    } catch {
      addToast('호텔 목록을 불러오지 못했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  function planLabel(plan: string | null) {
    if (!plan) return '-'
    const map: Record<string, string> = { free: '무료', starter: '스타터', pro: '프로', enterprise: '엔터프라이즈' }
    return map[plan] ?? plan
  }

  function planColor(plan: string | null) {
    if (!plan || plan === 'free') return 'bg-slate-100 text-slate-600'
    if (plan === 'starter') return 'bg-blue-50 text-blue-700'
    if (plan === 'pro') return 'bg-violet-50 text-violet-700'
    return 'bg-amber-50 text-amber-700'
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">등록 호텔</h2>
          <p className="text-xs text-slate-400 mt-0.5">총 {hotels.length}개</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : hotels.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">등록된 호텔이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">호텔명</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">플랜</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">객실 수</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hotels.map(h => (
                <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-slate-900">{h.name}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${planColor(h.subscription_plan)}`}>
                      {planLabel(h.subscription_plan)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-700 tabular-nums">{h.roomCount}</td>
                  <td className="px-6 py-3.5 text-slate-500">{formatDate(h.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Licenses Tab ─────────────────────────────────────────────────────────── */

function LicensesTab({ addToast }: { addToast: (msg: string, type?: ToastType) => void }) {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/license')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setLicenses(data.licenses)
    } catch {
      addToast('라이선스 목록을 불러오지 못했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  async function issueKey() {
    setIssuing(true)
    try {
      const res = await fetch('/api/super-admin/license', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        addToast(data.error ?? '발급 실패', 'error')
        return
      }
      const { key } = await res.json()
      await navigator.clipboard.writeText(key)
      addToast(`${key} — 클립보드에 복사됨`)
      await load()
    } catch {
      addToast('라이선스 발급 중 오류가 발생했습니다.', 'error')
    } finally {
      setIssuing(false)
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const unusedCount = licenses.filter(l => !l.used_at).length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">라이선스 키</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            총 {licenses.length}개 · 미사용 {unusedCount}개
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading || issuing}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium disabled:opacity-40"
          >
            새로고침
          </button>
          <button
            onClick={issueKey}
            disabled={issuing}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            {issuing ? (
              <>
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                발급 중...
              </>
            ) : (
              '+ 새 라이선스 발급'
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : licenses.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">발급된 라이선스가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">키</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">발급일</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">사용 여부</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">사용 호텔 ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licenses.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded select-all">
                      {l.key}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{formatDate(l.created_at)}</td>
                  <td className="px-6 py-3.5">
                    {l.used_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        사용됨 ({formatDate(l.used_at)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        미사용
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-slate-400 font-mono text-xs truncate max-w-[200px]">
                    {l.hotel_id ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
