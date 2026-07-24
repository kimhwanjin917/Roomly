'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { C, cardSt } from '@/lib/theme'

const inputSt: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 10, fontSize: 13, color: C.text,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

type ApiKey = {
  id: string
  key_prefix: string
  name: string
  last_used: string | null
  created_at: string
}

export default function SettingsClient({ hotelName, hotelId }: { hotelName: string; hotelId: string }) {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/api-keys').then(r => r.ok ? r.json() : []).then(setApiKeys)
  }, [])

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
      const r = await fetch('/api/admin/api-keys')
      if (r.ok) setApiKeys(await r.json())
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
    if (!deletePassword) { setDeleteError('비밀번호를 입력해주세요.'); return }
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch('/api/admin/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? '탈퇴에 실패했습니다.')
        return
      }
      await createClient().auth.signOut()
      router.push('/')
    } catch {
      setDeleteError('탈퇴에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-enter { animation: fadeUp 0.18s ease-out both; }
      `}</style>

      <main className="page-enter md:pb-6" style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>설정</h1>

        {/* 호텔 정보 */}
        <section style={cardSt}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>호텔 정보</h2>
          <div>
            <p style={{ fontSize: 11, color: C.textMid, marginBottom: 6, fontWeight: 600 }}>호텔명</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>{hotelName}</p>
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, color: C.textMid, marginBottom: 6, fontWeight: 600 }}>호텔 ID</p>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: C.textDim, padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, wordBreak: 'break-all' }}>{hotelId}</p>
          </div>
        </section>

        {/* 공개 API 키 */}
        <section style={cardSt}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>공개 API 키</h2>
            <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>PMS 연동 또는 외부 서비스 연결에 사용</p>
          </div>

          {newKey && (
            <div style={{ marginBottom: 16, padding: 14, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 8 }}>API 키가 발급되었습니다. 지금만 확인 가능합니다.</p>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: C.text, wordBreak: 'break-all', background: C.surface, padding: 8, borderRadius: 8 }}>{newKey}</p>
              <button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null) }} style={{ marginTop: 8, fontSize: 12, color: C.accent, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>복사 후 닫기</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {apiKeys.length === 0 && <p style={{ fontSize: 13, color: C.textDim, textAlign: 'center', padding: '16px 0' }}>발급된 API 키가 없습니다</p>}
            {apiKeys.map(k => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{k.name}</p>
                  <p style={{ fontSize: 11, color: C.textDim, fontFamily: 'monospace' }}>{k.key_prefix}...</p>
                  <p style={{ fontSize: 11, color: C.textDim }}>마지막 사용: {k.last_used ? new Date(k.last_used).toLocaleDateString('ko-KR') : '없음'}</p>
                </div>
                <button onClick={() => revokeApiKey(k.id)} style={{ fontSize: 12, color: C.red, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>폐기</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="키 이름 (선택)"
              style={{ ...inputSt, flex: 1 }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.accent }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
            />
            <button
              onClick={createApiKey}
              disabled={saving}
              style={{ padding: '11px 18px', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.4 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >{saving ? '발급 중...' : '+ 발급'}</button>
          </div>
        </section>

        {/* 계정 탈퇴 */}
        <section style={cardSt}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>계정 탈퇴</h2>
          <p style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>탈퇴 시 호텔 정보, 객실, 직원, 청소 이력 등 모든 데이터가 영구 삭제됩니다.</p>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{ padding: '11px 18px', background: 'rgba(248,113,113,0.1)', color: C.red, fontSize: 13, fontWeight: 700, border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}
            >계정 탈퇴</button>
          ) : (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 12 }}>정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
              <p style={{ fontSize: 11, color: C.textMid, marginBottom: 8 }}>확인을 위해 비밀번호를 입력해주세요.</p>
              <input
                type="password"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError('') }}
                placeholder="비밀번호"
                autoComplete="current-password"
                style={{ ...inputSt, marginBottom: 10 }}
              />
              {deleteError && (
                <p style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{deleteError}</p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setDeleteConfirm(false); setDeletePassword(''); setDeleteError('') }}
                  style={{ flex: 1, padding: '11px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: C.text, cursor: 'pointer', fontFamily: 'inherit' }}
                >취소</button>
                <button
                  onClick={deleteAccount}
                  disabled={deleting || !deletePassword}
                  style={{ flex: 1, padding: '11px 0', background: C.red, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting || !deletePassword ? 0.5 : 1, fontFamily: 'inherit' }}
                >{deleting ? '처리 중...' : '탈퇴 확인'}</button>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
