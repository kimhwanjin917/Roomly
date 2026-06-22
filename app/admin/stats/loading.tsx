export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 스켈레톤 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse hidden sm:block" />
            </div>
            <div className="flex gap-1">
              {[72, 60, 60, 44].map((w, i) => (
                <div key={i} className="h-7 bg-gray-200 rounded-md animate-pulse" style={{ width: w }} />
              ))}
            </div>
          </div>
          <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* 날짜 선택 스켈레톤 */}
        <div className="flex items-center gap-3">
          <div className="w-36 h-9 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* 숫자 요약 3개 큰 박스 */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center gap-2">
              <div className="w-14 h-9 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-10 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* 진행률 바 스켈레톤 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="flex justify-between">
            <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
            <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
        </div>

        {/* 막대 차트 형태 스켈레톤 — 직원별 통계 */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
                {/* 막대 바 */}
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden animate-pulse">
                  <div
                    className="h-full bg-gray-300 rounded-full"
                    style={{ width: `${75 - i * 15}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
