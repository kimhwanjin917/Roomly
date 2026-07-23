import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type Hotel = {
  id: string
  name: string
  subscription_plan: string
  last_active_at: string | null
}

async function getOrgHotels(orgId: string): Promise<Hotel[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('hotels')
    .select('id, name, subscription_plan, last_active_at')
    .eq('org_id', orgId)
    .order('name')
  return (data as Hotel[]) ?? []
}

export default async function OrgDashboardPage({ params }: { params: { orgId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hotels = await getOrgHotels(params.orgId)
  const { data: org } = await supabase.from('organizations').select('name').eq('id', params.orgId).single()

  const totalHotels = hotels.length
  const activeToday = hotels.filter(h => {
    if (!h.last_active_at) return false
    const today = new Date().toISOString().slice(0, 10)
    return h.last_active_at.slice(0, 10) === today
  }).length

  return (
    <div className="min-h-screen bg-toss-bg" style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      {/* 헤더 */}
      <div className="bg-white border-b border-[#F2F4F6] px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 bg-[#3182F6] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </Link>
            <div>
              <p className="text-xs text-[#6B7684]">법인 관리</p>
              <p className="text-base font-bold text-[#191919]">{org?.name ?? '법인'}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-20">
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-5">
            <p className="text-xs text-[#6B7684] mb-1">총 호텔</p>
            <p className="text-3xl font-bold text-[#191919]">{totalHotels}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-5">
            <p className="text-xs text-[#6B7684] mb-1">오늘 활성</p>
            <p className="text-3xl font-bold text-toss-blue">{activeToday}</p>
          </div>
        </div>

        {/* 호텔 목록 */}
        <h2 className="text-base font-bold text-[#191919] mb-3">호텔 목록</h2>
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {hotels.length === 0 && (
            <div className="p-12 text-center text-[#B0B8C1] text-sm">등록된 호텔이 없습니다</div>
          )}
          {hotels.map((hotel, idx) => (
            <Link
              key={hotel.id}
              href={`/admin?hotel=${hotel.id}`}
              className={`flex items-center justify-between px-5 py-4 hover:bg-[#F8F9FB] transition-colors ${
                idx < hotels.length - 1 ? 'border-b border-[#F2F4F6]' : ''
              }`}
            >
              <div>
                <p className="font-bold text-[#191919]">{hotel.name}</p>
                <p className="text-xs text-[#B0B8C1] mt-0.5">
                  플랜: {hotel.subscription_plan} · 마지막 활성:{' '}
                  {hotel.last_active_at
                    ? new Date(hotel.last_active_at).toLocaleDateString('ko-KR')
                    : '없음'}
                </p>
              </div>
              <svg viewBox="0 0 20 20" fill="#B0B8C1" className="w-4 h-4">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
              </svg>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
