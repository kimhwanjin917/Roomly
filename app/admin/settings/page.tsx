'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/AdminNav'

type ApiKey = {
  id: string
  key_prefix: string
  name: string
  last_used: string | null
  created_at: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [hotelName, setHotelName] = useState('')
  const [hotelId, setHotelId] = useState('')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const hid = user.app_metadata?.hotel_id as string
      setHotelId(hid)
      const { data: hotel } = await supabase.from('hotels').select('name').eq('id', hid).single()
      setHotelName(hotel?.name ?? '')
      await loadApiKeys(hid)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadApiKeys(hid?: string) {
    const res = await fetch('/api/admin/api-keys')
    if (res.ok) setApiKeys(await res.json())
  }

  async function createApiKey() {
    setSaving(true)
    const res = await fetch('/api/admin/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName || 'Default' }),
    })
    if (res.ok) {
      const { key } = await res.json()
      setNewKey(key)
      setNewKeyName('')
      await loadApiKeys()
    }
    setSaving(false)
  }

  async function revokeApiKey(id: string) {
    await fetch('/api/admin/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setApiKeys(prev => prev.filter(k => k.id !== id))
  }

  async function deleteAccount() {
    const res = await fetch('/api/admin/account/delete', { method: 'DELETE' })
    if (res.ok) {
      await createClient().auth.signOut()
      router.push('/')
    }
  }

  if (loading) return <div className="min-h-screen bg-toss-bg md:pl-[220px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-toss-bg md:pl-[220px]">
      <AdminNav />
      <main className="max-w-2xl mx-auto px-4 py-5 pb-20 space-y-5">
        <h1 className="text-xl font-bold text-[#191919]">설정</h1>

        {/* 호텔 정보 */}
        <section className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="text-base font-bold text-[#191919] mb-4">호텔 정보</h2>
          <div>
            <p className="text-xs text-[#6B7684] mb-1.5 font-medium">호텔명</p>
            <p className="text-sm font-semibold text-[#191919] px-4 py-3 bg-[#F2F4F6] rounded-xl">{hotelName}</p>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#6B7684] mb-1.5 font-medium">호텔 ID</p>
            <p className="text-xs font-mono text-[#B0B8C1] px-4 py-3 bg-[#F2F4F6] rounded-xl break-all">{hotelId}</p>
          </div>
        </section>

        {/* 공개 API 키 */}
        <section className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#191919]">공개 API 키</h2>
              <p className="text-xs text-[#6B7684] mt-0.5">PMS 연동 또는 외부 서비스 연결에 사용</p>
            </div>
          </div>

          {newKey && (
            <div className="mb-4 p-4 bg-[#E6FBF1] rounded-xl border border-[#05C072]/30">
              <p className="text-xs font-bold text-toss-success mb-2">API 키가 발급되었습니다. 지금만 확인 가능합니다.</p>
              <p className="text-xs font-mono text-[#191919] break-all bg-white p-2 rounded-lg">{newKey}</p>
              <button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null) }} className="mt-2 text-xs text-toss-blue font-bold">복사 후 닫기</button>
            </div>
          )}

          <div className="space-y-2 mb-4">
            {apiKeys.length === 0 && <p className="text-sm text-[#B0B8C1] text-center py-4">발급된 API 키가 없습니다</p>}
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center justify-between px-4 py-3 bg-[#F2F4F6] rounded-xl">
                <div>
                  <p className="text-sm font-bold text-[#191919]">{k.name}</p>
                  <p className="text-xs text-[#B0B8C1] font-mono">{k.key_prefix}...</p>
                  <p className="text-xs text-[#B0B8C1]">마지막 사용: {k.last_used ? new Date(k.last_used).toLocaleDateString('ko-KR') : '없음'}</p>
                </div>
                <button onClick={() => revokeApiKey(k.id)} className="text-xs text-toss-error font-bold">폐기</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="키 이름 (선택)"
              className="flex-1 px-4 py-2.5 bg-[#F2F4F6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue"
            />
            <button
              onClick={createApiKey}
              disabled={saving}
              className="px-4 py-2.5 bg-toss-blue text-white text-sm font-bold rounded-xl disabled:opacity-40"
            >{saving ? '발급 중...' : '+ 발급'}</button>
          </div>
        </section>

        {/* 계정 탈퇴 */}
        <section className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="text-base font-bold text-[#191919] mb-1">계정 탈퇴</h2>
          <p className="text-xs text-[#6B7684] mb-4">탈퇴 시 호텔 정보, 객실, 직원, 청소 이력 등 모든 데이터가 영구 삭제됩니다.</p>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2.5 bg-[#FFF0F0] text-toss-error text-sm font-bold rounded-xl"
            >계정 탈퇴</button>
          ) : (
            <div className="bg-[#FFF0F0] rounded-xl p-4">
              <p className="text-sm font-bold text-toss-error mb-3">정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 bg-white rounded-xl text-sm font-bold text-[#191919]">취소</button>
                <button onClick={deleteAccount} className="flex-1 py-2.5 bg-toss-error text-white rounded-xl text-sm font-bold">탈퇴 확인</button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
